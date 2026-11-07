// Pure logic with no Obsidian imports, so it can be tested without Obsidian.
import type {
	Frontmatter,
	HistoryEntry,
	Item,
	ItemKind,
	PluginSettings,
	Profile,
	Region,
	RegionData,
	RegionPatch,
	State,
} from "./types.ts";

const LIST_KEYS = ["doing", "fix", "links"] as const;
export const ITEM_KINDS: ItemKind[] = ["weapon", "armor", "gear"];
/** Fields that are removed from the stored region when they end up empty. */
const CLEARABLE = new Set<string>(["note", ...LIST_KEYS]);

/** Local date as YYYY-MM-DD. */
function today(d = new Date()): string {
	const p = (n: number): string => String(n).padStart(2, "0");
	return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function slug(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "item"
	);
}

/** A slug not already in `taken`, adding -2, -3 ... as needed. */
export function uniqueId(text: string, taken: string[]): string {
	const base = slug(text);
	let id = base;
	for (let n = 2; taken.includes(id); n++) id = `${base}-${String(n)}`;
	return id;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/** Frontmatter list values arrive as arrays, a single string, or nothing. */
export function toList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return (value as unknown[])
			.filter((v): v is string | number => typeof v === "string" || typeof v === "number")
			.map((v) => String(v).trim())
			.filter(Boolean);
	}
	if (typeof value === "string") {
		return value
			.split("\n")
			.map((v) => v.trim())
			.filter(Boolean);
	}
	return [];
}

function toHistory(value: unknown): HistoryEntry[] {
	if (!Array.isArray(value)) return [];
	const out: HistoryEntry[] = [];
	for (const item of value as unknown[]) {
		const { date, from, to } = asRecord(item);
		if (typeof date === "string" && typeof from === "string" && typeof to === "string") {
			out.push({ date, from, to });
		}
	}
	return out;
}

/** Region data as stored in the profile note, with every field defaulted. */
export function readRegion(fm: Frontmatter | undefined, regionId: string): RegionData {
	const r = asRecord(asRecord(fm?.regions)[regionId]);
	return {
		status: typeof r.status === "string" ? r.status : null,
		note: typeof r.note === "string" ? r.note : "",
		doing: toList(r.doing),
		fix: toList(r.fix),
		links: toList(r.links),
		history: toHistory(r.history),
	};
}

/** The profile's state for a stored status, falling back to the default state. */
export function resolveState(profile: Profile, status: string | null): State {
	const found =
		profile.states.find((s) => s.id === status) ??
		profile.states.find((s) => s.id === profile.defaultState) ??
		profile.states[0];
	if (!found) throw new Error(`Profile "${profile.name}" has no states`);
	return found;
}

/** True when the stored status is set but is not one of the profile's states. */
export function isUnknownStatus(profile: Profile, status: string | null): boolean {
	return Boolean(status) && !profile.states.some((s) => s.id === status);
}

/** How many regions sit in each state, keyed by state id. */
export function tally(profile: Profile, fm: Frontmatter | undefined): Record<string, number> {
	const counts: Record<string, number> = Object.fromEntries(profile.states.map((s) => [s.id, 0]));
	for (const region of profile.regions) {
		const id = resolveState(profile, readRegion(fm, region.id).status).id;
		counts[id] = (counts[id] ?? 0) + 1;
	}
	return counts;
}

/** The region to open first: the worst "bad" state, else the first region. */
export function pickInitial(profile: Profile, fm: Frontmatter | undefined): string | null {
	let best: { id: string; pips: number } | null = null;
	for (const region of profile.regions) {
		const s = resolveState(profile, readRegion(fm, region.id).status);
		if (s.bad && (!best || s.pips < best.pips)) best = { id: region.id, pips: s.pips };
	}
	return best?.id ?? profile.regions[0]?.id ?? null;
}

export interface ProfileSummary {
	/** Non-default states that at least one region is in, in the profile's state order. */
	problems: { state: State; count: number }[];
	/** The region in the lowest non-default state, or null when everything is in the default state. */
	worst: { region: Region; state: State } | null;
}

/** A short picture of a profile for a party tile: what is wrong and what is worst. */
export function summarizeProfile(profile: Profile, fm: Frontmatter | undefined): ProfileSummary {
	const counts = tally(profile, fm);
	const problems = profile.states
		.filter((s) => s.id !== profile.defaultState && (counts[s.id] ?? 0) > 0)
		.map((state) => ({ state, count: counts[state.id] ?? 0 }));
	let worst: ProfileSummary["worst"] = null;
	for (const region of profile.regions) {
		const state = resolveState(profile, readRegion(fm, region.id).status);
		if (state.id !== profile.defaultState && (!worst || state.pips < worst.state.pips))
			worst = { region, state };
	}
	return { problems, worst };
}

function isEmpty(value: unknown): boolean {
	return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

/**
 * Applies an edit to a frontmatter object in place.
 * A status change appends { date, from, to } to the region's history.
 * Empty fields are removed so the note stays tidy.
 */
export function applyEdit(
	fm: Frontmatter,
	profile: Profile,
	regionId: string,
	patch: RegionPatch,
	date = today(),
): Frontmatter {
	const regions = asRecord(fm.regions);
	const cur = asRecord(regions[regionId]);
	const next: Record<string, unknown> = { ...cur };

	if (patch.status !== undefined) {
		const from = typeof cur.status === "string" ? cur.status : profile.defaultState;
		if (patch.status !== from) {
			next.history = [...toHistory(cur.history), { date, from, to: patch.status }];
		}
		next.status = patch.status;
	}
	if (patch.note !== undefined) next.note = patch.note.trim();
	for (const key of LIST_KEYS) {
		const value = patch[key];
		if (value !== undefined) next[key] = toList(value);
	}
	const kept = Object.entries(next).filter(([key, value]) => !(CLEARABLE.has(key) && isEmpty(value)));
	fm.regions = { ...regions, [regionId]: Object.fromEntries(kept) };
	return fm;
}

/** Parses the `key: value` lines of a character-info code block. Lines starting with # are comments. */
export function parseBlock(source: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of source.split("\n")) {
		if (line.trimStart().startsWith("#")) continue;
		const m = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
		if (m?.[1] !== undefined && m[2] !== undefined) {
			out[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "");
		}
	}
	return out;
}

function isState(v: unknown): v is State {
	const r = asRecord(v);
	return (
		typeof r.id === "string" &&
		typeof r.label === "string" &&
		typeof r.color === "string" &&
		typeof r.pips === "number" &&
		typeof r.bad === "boolean"
	);
}

function isRegion(v: unknown): v is Region {
	const r = asRecord(v);
	return typeof r.id === "string" && typeof r.name === "string";
}

/** Profiles saved before templates were recorded: guess the template from the map they use. */
function templateForMap(map: string): string {
	if (map === "body") return "body";
	return map === "humanoid" ? "character" : "blank";
}

type StoredProfile = Omit<Profile, "template"> & { template?: unknown };

function isStoredProfile(v: unknown): v is StoredProfile {
	const r = asRecord(v);
	return (
		typeof r.id === "string" &&
		typeof r.name === "string" &&
		typeof r.map === "string" &&
		typeof r.defaultState === "string" &&
		typeof r.dataPath === "string" &&
		Array.isArray(r.states) &&
		(r.states as unknown[]).length > 0 &&
		(r.states as unknown[]).every(isState) &&
		Array.isArray(r.regions) &&
		(r.regions as unknown[]).every(isRegion)
	);
}

/** Reads saved plugin data, dropping anything malformed instead of trusting it. */
export function normalizeSettings(raw: unknown): PluginSettings {
	const r = asRecord(raw);
	const stored = Array.isArray(r.profiles) ? (r.profiles as unknown[]).filter(isStoredProfile) : [];
	const profiles = stored.map((p) => ({
		...p,
		template: typeof p.template === "string" ? p.template : templateForMap(p.map),
	}));
	return {
		profiles,
		defaultProfile: typeof r.defaultProfile === "string" ? r.defaultProfile : "",
		features: { inventory: asRecord(r.features).inventory === true },
	};
}

function isItemKind(value: unknown): value is ItemKind {
	return ITEM_KINDS.some((k) => k === value);
}

/** A non-empty string, or null for anything else. */
function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value ? value : null;
}

/** One inventory entry with defaults filled in, or null when it has no name. */
function toItem(entry: unknown): Item | null {
	const r = asRecord(entry);
	const name = typeof r.name === "string" ? r.name.trim() : "";
	if (!name) return null;
	return {
		name,
		kind: isItemKind(r.kind) ? r.kind : "gear",
		qty: typeof r.qty === "number" && r.qty >= 1 ? Math.floor(r.qty) : 1,
		note: typeof r.note === "string" ? r.note.trim() : "",
		region: textOrNull(r.region),
		look: textOrNull(r.look),
	};
}

/** The inventory in a profile note. Entries without a name are dropped and the rest are defaulted. */
export function readInventory(fm: Frontmatter | undefined): Item[] {
	const raw: unknown = fm?.inventory;
	if (!Array.isArray(raw)) return [];
	return (raw as unknown[]).map(toItem).filter((i): i is Item => i !== null);
}

/** Writes the inventory into a frontmatter object in place, leaving out fields that are empty. */
export function applyInventory(fm: Frontmatter, items: Item[]): Frontmatter {
	if (!items.length) {
		delete fm.inventory;
		return fm;
	}
	fm.inventory = items.map((i) => ({
		name: i.name,
		kind: i.kind,
		...(i.qty === 1 ? {} : { qty: i.qty }),
		...(i.note ? { note: i.note } : {}),
		...(i.region ? { region: i.region } : {}),
		...(i.look ? { look: i.look } : {}),
	}));
	return fm;
}

/** The items worn or held on one region, in the order they are listed. */
export function itemsOnRegion(items: Item[], regionId: string): Item[] {
	return items.filter((i) => i.region === regionId);
}

/** An item as one line of text: quantity when more than one, then the name and note. */
export function describeItem(item: Item): string {
	const count = item.qty > 1 ? `${String(item.qty)}× ` : "";
	return `${count}${item.name}${item.note ? ` · ${item.note}` : ""}`;
}

/** The looks of the armor that has a drawing, for the figure's armor view. */
export function armorLooks(items: Item[]): string[] {
	return items.flatMap((i) => (i.kind === "armor" && i.look !== null ? [i.look] : []));
}
