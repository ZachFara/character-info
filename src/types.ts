/** One selectable state, such as "Injured". `bad` marks a state that counts as a problem. */
export interface State {
	id: string;
	label: string;
	color: string;
	pips: number;
	bad: boolean;
}

/** One part of a profile. Its id also names the map shape that draws it, if any. */
export interface Region {
	id: string;
	name: string;
}

/** A named set of regions, states and a map, stored in the plugin settings. */
export interface Profile {
	id: string;
	name: string;
	/** The template this profile starts from, so a definition block can be re-applied to it. */
	template: string;
	map: string;
	states: State[];
	defaultState: string;
	regions: Region[];
	dataPath: string;
	/** Days before a region in a non-default state asks to be reviewed. 0 turns review badges off. */
	reviewAfterDays: number;
}

export interface PluginSettings {
	profiles: Profile[];
	defaultProfile: string;
	/** Optional features, switched on or off in settings. The inventory starts off, reviews start on. */
	features: { inventory: boolean; reviews: boolean };
	/** Where new data notes go, relative to the vault root. "" is the root itself. */
	dataFolder: string;
}

export type ItemKind = "weapon" | "armor" | "gear";

/** One thing a profile carries. `region` is where it is worn or held, or null when it is just carried. */
export interface Item {
	name: string;
	kind: ItemKind;
	qty: number;
	note: string;
	region: string | null;
	/** Which drawing shows this piece on the figure, such as `gravethorn:helm`. Null draws nothing. */
	look: string | null;
}

export interface HistoryEntry {
	date: string;
	from: string;
	to: string;
}

/** A region as stored in a profile note, with every field defaulted. */
export interface RegionData {
	status: string | null;
	note: string;
	doing: string[];
	fix: string[];
	links: string[];
	history: HistoryEntry[];
	/** The last day the region was saved or marked reviewed, as YYYY-MM-DD, or null. */
	reviewed: string | null;
}

/** The fields an edit may change. Absent fields are left alone. */
export interface RegionPatch {
	status?: string;
	note?: string;
	doing?: string[];
	fix?: string[];
	links?: string[];
	/** True for a save that changes nothing but the review date. Every save stamps that date anyway. */
	reviewed?: boolean;
}

/** Frontmatter as Obsidian hands it over: untrusted until read through `readRegion`. */
export type Frontmatter = Record<string, unknown>;
