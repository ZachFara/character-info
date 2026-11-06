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
	map: string;
	states: State[];
	defaultState: string;
	regions: Region[];
	dataPath: string;
}

export interface PluginSettings {
	profiles: Profile[];
	defaultProfile: string;
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
}

/** The fields an edit may change. Absent fields are left alone. */
export interface RegionPatch {
	status?: string;
	note?: string;
	doing?: string[];
	fix?: string[];
	links?: string[];
}

/** Frontmatter as Obsidian hands it over: untrusted until read through `readRegion`. */
export type Frontmatter = Record<string, unknown>;
