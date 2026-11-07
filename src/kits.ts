// Starter kits of weapons, armor and gear. Pure data and placement logic, no Obsidian imports.
//
// Naming rule (decision 0011): every name and description here is generic or original. Kits may
// evoke a genre, such as black horned plate with an ember glow, but never use another work's
// protected names or reproduce its specific designs. A test guards the obvious terms.
import type { Item, ItemKind, Region } from "./types.ts";

/** Where a kit item goes. `carried` means it is not worn or held on any region. */
type Slot = "head" | "torso" | "armR" | "armL" | "legR" | "legL" | "feet" | "carried";

interface KitItem {
	name: string;
	kind: ItemKind;
	note: string;
	slot: Slot;
	qty?: number;
	/** The drawing that shows this piece on the figure, from armor-art. */
	look?: string;
}

export interface Kit {
	label: string;
	items: KitItem[];
}

/** The region ids a slot may land on, best first. The first one a profile has is used. */
const SLOT_REGIONS: Record<Exclude<Slot, "carried">, string[]> = {
	head: ["head"],
	torso: ["torso", "chest", "core"],
	armR: ["armR", "arms", "hands"],
	armL: ["armL", "arms", "hands"],
	legR: ["legR", "thighs", "calves"],
	legL: ["legL", "thighs", "calves"],
	feet: ["feet"],
};

export const KITS = {
	soldier: {
		label: "Modern soldier",
		items: [
			{
				name: "Combat helmet",
				kind: "armor",
				slot: "head",
				look: "military:helm",
				note: "Ballistic shell with a night-vision mount",
			},
			{
				name: "Plate carrier",
				kind: "armor",
				slot: "torso",
				look: "military:chest",
				note: "Front, back and side plates with magazine pouches",
			},
			{
				name: "Right tactical glove",
				kind: "armor",
				slot: "armR",
				look: "military:gauntletR",
				note: "Hard knuckle guard",
			},
			{
				name: "Left tactical glove",
				kind: "armor",
				slot: "armL",
				look: "military:gauntletL",
				note: "Hard knuckle guard",
			},
			{ name: "Right knee pad", kind: "armor", slot: "legR", look: "military:greaveR", note: "Hard shell" },
			{ name: "Left knee pad", kind: "armor", slot: "legL", look: "military:greaveL", note: "Hard shell" },
			{
				name: "Combat boots",
				kind: "armor",
				slot: "feet",
				look: "military:boots",
				note: "Reinforced soles and ankle support",
			},
			{
				name: "Assault rifle",
				kind: "weapon",
				slot: "armR",
				note: "5.56 mm, 30-round magazine, optic and sling",
			},
			{ name: "Sidearm", kind: "weapon", slot: "carried", note: "9 mm pistol, holstered" },
			{ name: "Combat knife", kind: "weapon", slot: "carried", note: "Fixed blade, sheathed on the vest" },
			{ name: "Spare magazines", kind: "gear", slot: "carried", qty: 6, note: "30 rounds each" },
			{
				name: "First aid kit",
				kind: "gear",
				slot: "carried",
				note: "Tourniquet, pressure bandage and gauze",
			},
			{ name: "Radio", kind: "gear", slot: "carried", note: "Short range, with an earpiece" },
			{ name: "Water", kind: "gear", slot: "carried", qty: 3, note: "1 L bottles" },
		],
	},
	gravethorn: {
		label: "Gravethorn warplate (dark fantasy)",
		items: [
			{
				name: "Gravethorn helm",
				kind: "armor",
				slot: "head",
				look: "gravethorn:helm",
				note: "Black steel with swept horns and a visor slit that glows ember-red",
			},
			{
				name: "Gravethorn cuirass",
				kind: "armor",
				slot: "torso",
				look: "gravethorn:chest",
				note: "Ribbed black plates with jagged edges and ember light in the seams",
			},
			{
				name: "Thorned pauldrons",
				kind: "armor",
				slot: "torso",
				look: "gravethorn:pauldrons",
				note: "Spiked shoulder plates that curve like thorns",
			},
			{
				name: "Gravethorn right gauntlet",
				kind: "armor",
				slot: "armR",
				look: "gravethorn:gauntletR",
				note: "Black steel with talon-like finger plates",
			},
			{
				name: "Gravethorn left gauntlet",
				kind: "armor",
				slot: "armL",
				look: "gravethorn:gauntletL",
				note: "Black steel with talon-like finger plates",
			},
			{
				name: "Gravethorn right greave",
				kind: "armor",
				slot: "legR",
				look: "gravethorn:greaveR",
				note: "Black steel with a spiked knee guard",
			},
			{
				name: "Gravethorn left greave",
				kind: "armor",
				slot: "legL",
				look: "gravethorn:greaveL",
				note: "Black steel with a spiked knee guard",
			},
			{
				name: "Gravethorn boots",
				kind: "armor",
				slot: "feet",
				look: "gravethorn:boots",
				note: "Plated boots with clawed toes",
			},
			{
				name: "Gravethorn greatsword",
				kind: "weapon",
				slot: "armR",
				note: "Serrated black blade with ember runes along the fuller",
			},
			{
				name: "Thornfang dagger",
				kind: "weapon",
				slot: "carried",
				note: "Curved black blade, hooked like a thorn",
			},
		],
	},
} satisfies Record<string, Kit>;

export type KitKey = keyof typeof KITS;

export function isKitKey(key: string): key is KitKey {
	return key in KITS;
}

/** The first region id a slot can land on in this profile, or null when it has none. */
function regionFor(slot: Slot, regions: Region[]): string | null {
	if (slot === "carried") return null;
	return SLOT_REGIONS[slot].find((id) => regions.some((r) => r.id === id)) ?? null;
}

/** A kit's items placed on the regions this profile has. Items with no matching region are carried. */
export function kitItems(kit: Kit, regions: Region[]): Item[] {
	return kit.items.map((i) => ({
		name: i.name,
		kind: i.kind,
		qty: i.qty ?? 1,
		note: i.note,
		region: regionFor(i.slot, regions),
		look: i.look ?? null,
	}));
}

/** Kit items whose names are not already in the inventory, so adding a kit twice adds nothing twice. */
export function newKitItems(kit: Kit, regions: Region[], existing: Item[]): Item[] {
	const have = new Set(existing.map((i) => i.name.toLowerCase()));
	return kitItems(kit, regions).filter((i) => !have.has(i.name.toLowerCase()));
}
