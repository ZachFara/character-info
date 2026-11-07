// Turns the text of a character-info block into a profile. Pure logic, no Obsidian imports.
import { DEFAULT_REVIEW_DAYS, slug, uniqueId } from "./data.ts";
import { MAPS, STATE_SETS, TEMPLATES, getMap, makeProfile, type TemplateKey } from "./presets.ts";
import { isSvgPath } from "./svg-map.ts";
import type { Profile, Region, State } from "./types.ts";

export type ResolveResult = { ok: true; profile: Profile; warnings: string[] } | { ok: false; error: string };

/** Keys that make a block a definition, as opposed to a plain reference by name. */
const DEFINING_KEYS = ["template", "map", "add", "remove", "rename", "states", "default", "review"] as const;

/** Colours handed out along a `states:` list, by how many states there are. */
const GREEN = "#5aa469";
const YELLOW = "#e5c13b";
const ORANGE = "#e8883a";
const RED = "#e5534b";
const VIOLET = "#a06bd0";
const BLUE = "#4a90e2";
const GRAY = "#7a7a7a";
const RAMPS: Record<number, string[]> = {
	1: [GREEN],
	2: [GREEN, RED],
	3: [GREEN, YELLOW, RED],
	4: [GREEN, YELLOW, ORANGE, RED],
	5: [GREEN, YELLOW, ORANGE, RED, VIOLET],
};
const EXTRA_COLOURS = [BLUE, GRAY];
const MAX_PIPS = 5;
const HEX = /^(.*?)\s*=\s*(#[0-9a-fA-F]{3,8})$/;

function isTemplateKey(key: string): key is TemplateKey {
	return key in TEMPLATES;
}

function nonEmpty(value: string | undefined): string {
	return (value ?? "").trim();
}

/** True when the block has any key beyond `profile`, so it defines the profile. */
export function isDefinition(block: Record<string, string>): boolean {
	return DEFINING_KEYS.some((k) => nonEmpty(block[k]) !== "");
}

function splitList(text: string): string[] {
	return text
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function findRegion(regions: Region[], text: string): Region | undefined {
	const key = text.trim().toLowerCase();
	return regions.find((r) => r.id.toLowerCase() === key || r.name.toLowerCase() === key);
}

function applyRemove(regions: Region[], text: string, warnings: string[]): Region[] {
	let out = regions;
	for (const name of splitList(text)) {
		const found = findRegion(out, name);
		if (found) out = out.filter((r) => r !== found);
		else warnings.push(`remove: no region named "${name}"`);
	}
	return out;
}

function applyRename(regions: Region[], text: string, warnings: string[]): void {
	for (const pair of text.split(";")) {
		const at = pair.indexOf("=");
		if (at < 0) {
			if (pair.trim()) warnings.push(`rename: expected "Old = New" in "${pair.trim()}"`);
			continue;
		}
		const found = findRegion(regions, pair.slice(0, at));
		const name = pair.slice(at + 1).trim();
		if (found && name) found.name = name;
		else warnings.push(`rename: no region named "${pair.slice(0, at).trim()}"`);
	}
}

/** New regions reuse a map shape id when the name matches one, so a removed part can come back. */
function applyAdd(regions: Region[], text: string, mapShapes: string[]): void {
	for (const name of splitList(text)) {
		const shape = mapShapes.find((id) => id.toLowerCase() === name.toLowerCase());
		const taken = regions.map((r) => r.id);
		const id = shape && !taken.includes(shape) ? shape : uniqueId(name, taken);
		regions.push({ id, name });
	}
}

function colourFor(i: number, count: number): string {
	const ramp = RAMPS[count];
	if (ramp) return ramp[i] ?? GRAY;
	const base = RAMPS[5] ?? [];
	return base[i] ?? EXTRA_COLOURS[(i - base.length) % EXTRA_COLOURS.length] ?? GRAY;
}

function pipsFor(i: number, count: number): number {
	return count === 1 ? MAX_PIPS : Math.round((MAX_PIPS * (count - 1 - i)) / (count - 1));
}

/** Builds states from `Name, Name=#hex, ...`. The default state is not a problem, the rest are. */
function buildStates(
	text: string,
	defaultText: string,
	warnings: string[],
): { states: State[]; defaultState: string } {
	const taken: string[] = [];
	const parsed = splitList(text).map((token) => {
		const m = HEX.exec(token);
		return { label: (m?.[1] ?? token).trim(), colour: m?.[2] };
	});
	const states: State[] = parsed.map((p, i) => {
		const id = uniqueId(p.label, taken);
		taken.push(id);
		return {
			id,
			label: p.label,
			color: p.colour ?? colourFor(i, parsed.length),
			pips: pipsFor(i, parsed.length),
			bad: true,
		};
	});
	const wanted = defaultText.trim().toLowerCase();
	const chosen = wanted
		? states.find((s) => s.id === slug(wanted) || s.label.toLowerCase() === wanted)
		: undefined;
	if (wanted && !chosen) warnings.push(`default: no state named "${defaultText.trim()}"`);
	const fallback = chosen ?? states[0];
	for (const s of states) s.bad = s !== fallback;
	return { states, defaultState: fallback?.id ?? "" };
}

function baseTemplate(block: Record<string, string>, existing: Profile | undefined): string {
	const asked = nonEmpty(block.template).toLowerCase();
	if (asked) return asked;
	const kept = existing?.template;
	return kept !== undefined && isTemplateKey(kept) ? kept : "blank";
}

/** Applies `states` and `default`. Returns an error message, or null when it worked. */
function applyStates(profile: Profile, block: Record<string, string>, warnings: string[]): string | null {
	const defaultText = nonEmpty(block.default);
	if (nonEmpty(block.states)) {
		const built = buildStates(block.states ?? "", defaultText, warnings);
		if (!built.states.length) return "The states line has no states.";
		profile.states = built.states;
		profile.defaultState = built.defaultState;
	} else if (defaultText) {
		const wanted = defaultText.toLowerCase();
		const found = profile.states.find((s) => s.id === wanted || s.label.toLowerCase() === wanted);
		if (found) profile.defaultState = found.id;
		else warnings.push(`default: no state named "${defaultText}"`);
	}
	return null;
}

/** Applies `review: 30`, the days before a changed region asks to be reviewed. 0 turns it off. */
function applyReview(profile: Profile, text: string, warnings: string[]): void {
	if (!text) return;
	if (/^\d+$/.test(text)) profile.reviewAfterDays = Number(text);
	else warnings.push(`review: expected a number of days, such as 30, not "${text}"`);
}

/** Applies `remove`, `rename` and `add` to the regions. */
function applyRegions(profile: Profile, block: Record<string, string>, warnings: string[]): void {
	const shapes = Object.keys(getMap(profile.map).shapes);
	profile.regions = applyRemove(profile.regions, nonEmpty(block.remove), warnings);
	applyRename(profile.regions, nonEmpty(block.rename), warnings);
	applyAdd(profile.regions, nonEmpty(block.add), shapes);
}

/**
 * Resolves a defining block into a profile. The block is the source of truth: the profile is
 * rebuilt from its template every time, so removing a line removes its effect. An existing
 * registry entry lends its id and data note path, so stored data stays attached wherever it lives.
 */
export function resolveDefinition(
	block: Record<string, string>,
	existing: Profile | undefined,
	folder?: string,
): ResolveResult {
	const name = nonEmpty(block.profile);
	if (!name) return { ok: false, error: "Add a line like “profile: Thorn” to this block." };
	const template = baseTemplate(block, existing);
	if (!isTemplateKey(template)) {
		return { ok: false, error: `Unknown template “${template}”. Use ${Object.keys(TEMPLATES).join(", ")}.` };
	}
	const profile = makeProfile(template, name, [], folder);
	// A profile keeps its id and its data note, wherever that note has been moved to.
	if (existing) {
		profile.id = existing.id;
		profile.dataPath = existing.dataPath;
	}
	const rawMap = nonEmpty(block.map);
	const map = isSvgPath(rawMap) ? rawMap : rawMap.toLowerCase();
	if (map && !isSvgPath(map) && !(map in MAPS)) {
		return {
			ok: false,
			error: `Unknown map “${map}”. Use ${Object.keys(MAPS).join(", ")}, or the path of an SVG file.`,
		};
	}
	if (map) profile.map = map;

	const warnings: string[] = [];
	applyReview(profile, nonEmpty(block.review), warnings);
	applyRegions(profile, block, warnings);
	const error = applyStates(profile, block, warnings);
	return error === null ? { ok: true, profile, warnings } : { ok: false, error };
}

export type BlockMode = "simple" | "full";

/**
 * The text of a new block for a profile. The simple form is the name and a template. The full
 * form lists every key, with the template's own values, and comment lines that explain them.
 * Both resolve to exactly the template's profile until a line is changed.
 */
export function newProfileBlock(name: string, template: TemplateKey, mode: BlockMode): string {
	const t = TEMPLATES[template];
	const lines = [`profile: ${name}`, `template: ${template}`];
	if (mode === "full") {
		const set = STATE_SETS[t.stateSet];
		const defaultLabel = set.states.find((s) => s.id === set.defaultState)?.label ?? "";
		lines.push(
			`map: ${t.map}`,
			"# Regions. Add, remove or rename relative to the template.",
			`# It has: ${t.regions.map((r) => r.name).join(", ") || "nothing yet"}`,
			"add:",
			"remove:",
			"rename:",
			"# Days before a changed region asks to be reviewed. 0 turns review badges off.",
			`# review: ${String(DEFAULT_REVIEW_DAYS)}`,
			"# States, best first. The first is the default. Add =#hex to a state to set its colour.",
			`# states: ${set.states.map((s) => s.label).join(", ")}`,
			`# default: ${defaultLabel}`,
		);
	}
	return ["```character-info", ...lines, "```", ""].join("\n");
}

export interface PartyBlock {
	title: string | null;
	/** Profile names in the order written. */
	names: string[];
	/** True when the block says `all`, meaning every known profile. */
	all: boolean;
}

/** Adds the names on one line to the party, noticing `all`. */
function addPartyNames(party: PartyBlock, text: string): void {
	for (const name of text.split(",").map((n) => n.trim())) {
		if (name.toLowerCase() === "all") party.all = true;
		else if (name) party.names.push(name);
	}
}

/**
 * Reads the text of a character-party block: an optional `title:` line, then profile names one
 * per line or separated by commas. `all` means every known profile. A `profiles:` or `members:`
 * prefix is accepted. Lines starting with # are comments.
 */
export function parsePartyBlock(source: string): PartyBlock {
	const party: PartyBlock = { title: null, names: [], all: false };
	for (const raw of source.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const title = /^title\s*:\s*(.*)$/i.exec(line);
		if (title) party.title = (title[1] ?? "").trim() || null;
		else addPartyNames(party, /^(?:profiles|members)\s*:\s*(.*)$/i.exec(line)?.[1] ?? line);
	}
	return party;
}

/**
 * Adds a region name to a block's text by writing it into the `add:` line, creating that line
 * after `profile:` when there is none. Pass `template` when the block only referred to a profile,
 * so the block becomes a definition and keeps working.
 */
export function addRegionLine(source: string, name: string, template: string | null): string {
	const lines = source.split("\n");
	const at = lines.findIndex((l) => /^\s*add\s*:/i.test(l));
	if (at >= 0) {
		const current = (lines[at] ?? "").replace(/^\s*add\s*:\s*/i, "").trim();
		lines[at] = current ? `add: ${current}, ${name}` : `add: ${name}`;
	} else {
		const profileAt = lines.findIndex((l) => /^\s*profile\s*:/i.test(l));
		lines.splice(profileAt + 1, 0, ...(template ? [`template: ${template}`] : []), `add: ${name}`);
	}
	return lines.join("\n");
}
