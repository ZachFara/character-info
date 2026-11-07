// Built-in maps, state sets and starting templates.
// A map is a set of SVG shapes keyed by region id. A profile only draws the shapes whose
// region id it actually has, so deleting a region removes its shape. Regions with no shape
// live in the chip roster under the figure.
import { uniqueId } from "./data.ts";
import type { Profile, Region, State } from "./types.ts";

export interface MapPreset {
	label: string;
	viewBox: string;
	shapes: Record<string, string>;
}

interface StateSet {
	label: string;
	defaultState: string;
	states: State[];
}

interface Template {
	label: string;
	map: keyof typeof MAPS;
	stateSet: keyof typeof STATE_SETS;
	regions: Region[];
}

const C = {
	green: "#5aa469",
	blue: "#4a90e2",
	yellow: "#e5c13b",
	orange: "#e8883a",
	red: "#e5534b",
	gray: "#7a7a7a",
	dark: "#4b4b4b",
};

const BODY_VIEWBOX = "54 7 132 425";

export const MAPS = {
	none: { label: "No map (chips only)", viewBox: "0 0 10 10", shapes: {} },

	body: {
		label: "Human body (23 regions)",
		viewBox: BODY_VIEWBOX,
		shapes: {
			head: `<ellipse cx="120" cy="44" rx="25" ry="30"/>`,
			neck: `<rect x="108" y="68" width="24" height="24" rx="8"/>`,
			shoulders: `<ellipse cx="82" cy="105" rx="20" ry="17"/><ellipse cx="158" cy="105" rx="20" ry="17"/>`,
			lats: `<path d="M99 102 C89 120 89 146 99 166 L104 162 L104 102 Z"/><path d="M141 102 C151 120 151 146 141 166 L136 162 L136 102 Z"/>`,
			chest: `<rect x="98" y="98" width="22" height="44" rx="8"/><rect x="120" y="98" width="22" height="44" rx="8"/>`,
			arms: `<rect x="64" y="116" width="21" height="66" rx="10"/><rect x="155" y="116" width="21" height="66" rx="10"/>`,
			forearms: `<rect x="63" y="178" width="19" height="62" rx="9"/><rect x="158" y="178" width="19" height="62" rx="9"/>`,
			hands: `<ellipse cx="72" cy="252" rx="11" ry="14"/><ellipse cx="168" cy="252" rx="11" ry="14"/>`,
			core: `<rect x="98" y="142" width="44" height="56" rx="10"/>`,
			hips: `<path d="M96 196 L144 196 L146 220 Q146 242 132 246 L108 246 Q94 242 94 220 Z"/>`,
			thighs: `<rect x="95" y="244" width="23" height="80" rx="11"/><rect x="122" y="244" width="23" height="80" rx="11"/>`,
			knees: `<ellipse cx="106.5" cy="330" rx="12" ry="11"/><ellipse cx="133.5" cy="330" rx="12" ry="11"/>`,
			calves: `<rect x="96" y="336" width="21" height="72" rx="9"/><rect x="123" y="336" width="21" height="72" rx="9"/>`,
			feet: `<path d="M95 404 h23 v12 q0 9 -11.5 9 q-11.5 0 -11.5 -9 z"/><path d="M122 404 h23 v12 q0 9 -11.5 9 q-11.5 0 -11.5 -9 z"/>`,
			heart: `<path d="M118 110 c-4.4 -5.4 -12.6 -1.9 -12.6 4.5 c0 6.4 8.2 11.1 12.6 15.6 c4.4 -4.5 12.6 -9.2 12.6 -15.6 c0 -6.4 -8.2 -9.9 -12.6 -4.5 z"/>`,
			gut: `<rect x="105" y="160" width="30" height="30" rx="10"/>`,
		},
	},

	// Sides are the character's own, so the right arm is on the viewer's left.
	humanoid: {
		label: "Humanoid, hit locations (6 regions)",
		viewBox: BODY_VIEWBOX,
		shapes: {
			head: `<ellipse cx="120" cy="44" rx="25" ry="30"/>`,
			torso: `<rect x="96" y="96" width="48" height="112" rx="14"/>`,
			armR: `<rect x="62" y="104" width="24" height="150" rx="11"/>`,
			armL: `<rect x="154" y="104" width="24" height="150" rx="11"/>`,
			legR: `<rect x="95" y="214" width="23" height="208" rx="11"/>`,
			legL: `<rect x="122" y="214" width="23" height="208" rx="11"/>`,
		},
	},
} satisfies Record<string, MapPreset>;

export const STATE_SETS = {
	maintenance: {
		label: "Maintenance (Dialed in to Injured)",
		defaultState: "unknown",
		states: [
			{ id: "strong", label: "Dialed in", color: C.green, pips: 5, bad: false },
			{ id: "ok", label: "Maintaining", color: C.blue, pips: 4, bad: false },
			{ id: "watch", label: "Needs work", color: C.yellow, pips: 2, bad: true },
			{ id: "hurt", label: "Injured", color: C.red, pips: 1, bad: true },
			{ id: "unknown", label: "Untracked", color: C.gray, pips: 0, bad: false },
		],
	},
	wounds: {
		label: "Wounds (Healthy to Lost)",
		defaultState: "healthy",
		states: [
			{ id: "healthy", label: "Healthy", color: C.green, pips: 5, bad: false },
			{ id: "bruised", label: "Bruised", color: C.yellow, pips: 4, bad: true },
			{ id: "wounded", label: "Wounded", color: C.orange, pips: 3, bad: true },
			{ id: "maimed", label: "Maimed", color: C.red, pips: 1, bad: true },
			{ id: "lost", label: "Lost", color: C.dark, pips: 0, bad: true },
		],
	},
	condition: {
		label: "Condition (Working to Broken)",
		defaultState: "unknown",
		states: [
			{ id: "good", label: "Working", color: C.green, pips: 5, bad: false },
			{ id: "worn", label: "Worn", color: C.yellow, pips: 3, bad: true },
			{ id: "failing", label: "Failing", color: C.orange, pips: 2, bad: true },
			{ id: "broken", label: "Broken", color: C.red, pips: 1, bad: true },
			{ id: "unknown", label: "Unchecked", color: C.gray, pips: 0, bad: false },
		],
	},
} satisfies Record<string, StateSet>;

const regions = (pairs: [string, string][]): Region[] => pairs.map(([id, name]) => ({ id, name }));

const BODY_REGIONS = regions([
	["head", "Head & Brain"],
	["neck", "Neck & Posture"],
	["shoulders", "Shoulders"],
	["chest", "Chest"],
	["heart", "Heart & Lungs"],
	["lats", "Back & Lats"],
	["arms", "Arms"],
	["forearms", "Forearms & Grip"],
	["hands", "Hands & Wrists"],
	["core", "Core & Abs"],
	["gut", "Gut & Digestion"],
	["hips", "Hips & Low Back"],
	["thighs", "Quads & Hams"],
	["knees", "Knees"],
	["calves", "Calves & Ankles"],
	["feet", "Feet"],
	["pelvic", "Pelvic Floor"],
	["eyes", "Eyes"],
	["teeth", "Teeth & Jaw"],
	["skin", "Skin"],
	["sleep", "Sleep"],
	["nutrition", "Nutrition"],
	["bloodwork", "Bloodwork"],
]);

const HUMANOID_REGIONS = regions([
	["head", "Head"],
	["torso", "Torso"],
	["armR", "Right arm"],
	["armL", "Left arm"],
	["legR", "Right leg"],
	["legL", "Left leg"],
]);

/** Starting points offered when you add a profile. */
export const TEMPLATES = {
	body: { label: "My body (maintenance)", map: "body", stateSet: "maintenance", regions: BODY_REGIONS },
	character: {
		label: "Tabletop character (wounds)",
		map: "humanoid",
		stateSet: "wounds",
		regions: HUMANOID_REGIONS,
	},
	blank: { label: "Blank list (conditions)", map: "none", stateSet: "condition", regions: [] },
} satisfies Record<string, Template>;

export type TemplateKey = keyof typeof TEMPLATES;

const clone = <T>(value: T): T => structuredClone(value);

/** The map for a stored key. Unknown keys, such as a hand-edited one, fall back to no map. */
export function getMap(key: string): MapPreset {
	const found = (MAPS as Record<string, MapPreset | undefined>)[key];
	return found ?? MAPS.none;
}

/** A new profile from a template. `existing` keeps the id unique. */
export function makeProfile(templateKey: TemplateKey, name: string, existing: Profile[]): Profile {
	const t = TEMPLATES[templateKey];
	const set = STATE_SETS[t.stateSet];
	return {
		id: uniqueId(
			name,
			existing.map((p) => p.id),
		),
		name,
		map: t.map,
		states: clone(set.states),
		defaultState: set.defaultState,
		regions: clone(t.regions),
		dataPath: `Character Info/${name}.md`,
	};
}
