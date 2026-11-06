// Pure logic with no Obsidian imports, so it can be tested with `npm test`.

/** Local date as YYYY-MM-DD. */
export function today(d = new Date()) {
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function slug(text) {
	return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

/** A slug not already in `taken`, adding -2, -3 ... as needed. */
export function uniqueId(text, taken) {
	const base = slug(text);
	let id = base;
	for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
	return id;
}

/** Frontmatter list values arrive as arrays, a single string, or nothing. */
export function toList(value) {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	if (typeof value === "string") return value.split("\n").map((v) => v.trim()).filter(Boolean);
	return [];
}

/** Region data as stored in the profile note, with every field defaulted. */
export function readRegion(fm, regionId) {
	const r = fm?.regions?.[regionId] ?? {};
	return {
		status: typeof r.status === "string" ? r.status : null,
		note: typeof r.note === "string" ? r.note : "",
		doing: toList(r.doing),
		fix: toList(r.fix),
		links: toList(r.links),
		history: Array.isArray(r.history) ? r.history.filter((h) => h && typeof h === "object") : [],
	};
}

/** The profile's state object for a stored status, falling back to the default state. */
export function resolveState(profile, status) {
	return (
		profile.states.find((s) => s.id === status) ??
		profile.states.find((s) => s.id === profile.defaultState) ??
		profile.states[0]
	);
}

/** True when the stored status is set but is not one of the profile's states. */
export function isUnknownStatus(profile, status) {
	return Boolean(status) && !profile.states.some((s) => s.id === status);
}

/** How many regions sit in each state, keyed by state id. */
export function tally(profile, fm) {
	const counts = Object.fromEntries(profile.states.map((s) => [s.id, 0]));
	for (const region of profile.regions) {
		counts[resolveState(profile, readRegion(fm, region.id).status).id]++;
	}
	return counts;
}

/** The region to open first: the worst "bad" state, else the first region. */
export function pickInitial(profile, fm) {
	let best = null;
	for (const region of profile.regions) {
		const s = resolveState(profile, readRegion(fm, region.id).status);
		if (s.bad && (!best || s.pips < best.pips)) best = { id: region.id, pips: s.pips };
	}
	return best?.id ?? profile.regions[0]?.id ?? null;
}

/**
 * Applies an edit to a frontmatter object in place.
 * A status change appends { date, from, to } to the region's history.
 * Empty fields are removed so the note stays tidy.
 */
export function applyEdit(fm, profile, regionId, patch, date = today()) {
	fm.regions ??= {};
	const cur = fm.regions[regionId] ?? {};
	const next = { ...cur };

	if (patch.status !== undefined) {
		const from = cur.status ?? profile.defaultState;
		if (patch.status !== from) {
			next.history = [...(Array.isArray(cur.history) ? cur.history : []), { date, from, to: patch.status }];
		}
		next.status = patch.status;
	}
	if (patch.note !== undefined) next.note = patch.note.trim();
	for (const key of ["doing", "fix", "links"]) {
		if (patch[key] !== undefined) next[key] = toList(patch[key]);
	}
	for (const key of ["note", "doing", "fix", "links"]) {
		const v = next[key];
		if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete next[key];
	}
	fm.regions[regionId] = next;
	return fm;
}

/** Parses the `key: value` lines of a character-info code block. */
export function parseBlock(source) {
	const out = {};
	for (const line of String(source).split("\n")) {
		const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/);
		if (m) out[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "");
	}
	return out;
}
