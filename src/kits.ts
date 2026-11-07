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
				note: "Ballistic shell with a night-vision mount",
			},
			{
				name: "Plate carrier",
				kind: "armor",
				slot: "torso",
				note: "Front, back and side armor plates with load-bearing webbing",
			},
			{
				name: "Assault rifle",
				kind: "weapon",
				slot: "armR",
				note: "5.56 mm, 30-round magazine, optic and sling",
			},
			{ name: "Sidearm", kind: "weapon", slot: "carried", note: "9 mm pistol, holstered" },
			{ name: "Combat knife", kind: "weapon", slot: "carried", note: "Fixed blade, sheathed on the vest" },
			{ name: "Combat boots", kind: "armor", slot: "feet", note: "Reinforced soles and ankle support" },
			{ name: "Knee and elbow pads", kind: "armor", slot: "carried", note: "Hard shell" },
			{ name: "Spare magazines", kind: "gear", slot: "carried", qty: 6, note: "30 rounds each" },
			{
				name: "First aid kit",
				kind: "gear",
				slot: "carried",
				note: "Tourniquet, pressure bandage and gauze",
			},
			{ name: "Radio", kind: "gear", slot: "carried", note: "Short range, with an earpiece" },
			{ name: "Water", kind: "gear", slot: "carried", qty: 3, note: "1 L bottles" },
			{ name: "Field rations", kind: "gear", slot: "carried", qty: 2, note: "One day each" },
		],
	},
	knight: {
		label: "Medieval knight",
		items: [
			{ name: "Great helm", kind: "armor", slot: "head", note: "Steel, narrow eye slit, plume socket" },
			{ name: "Plate cuirass", kind: "armor", slot: "torso", note: "Riveted breastplate and backplate" },
			{ name: "Mail hauberk", kind: "armor", slot: "torso", note: "Riveted mail worn under the plate" },
			{ name: "Left gauntlet", kind: "armor", slot: "armL", note: "Articulated steel" },
			{ name: "Right gauntlet", kind: "armor", slot: "armR", note: "Articulated steel" },
			{ name: "Left greave", kind: "armor", slot: "legL", note: "Plate shin guard" },
			{ name: "Right greave", kind: "armor", slot: "legR", note: "Plate shin guard" },
			{ name: "Sabatons", kind: "armor", slot: "feet", note: "Articulated steel boots" },
			{ name: "Longsword", kind: "weapon", slot: "armR", note: "Double-edged, hand-and-a-half grip" },
			{
				name: "Kite shield",
				kind: "armor",
				slot: "armL",
				note: "Wood faced with leather, painted with heraldry",
			},
			{ name: "Rondel dagger", kind: "weapon", slot: "carried", note: "For close work" },
			{ name: "Heraldic surcoat", kind: "gear", slot: "carried", note: "Worn over the armor" },
			{ name: "Waterskin", kind: "gear", slot: "carried", note: "Leather" },
		],
	},
	gravethorn: {
		label: "Gravethorn warplate (dark fantasy)",
		items: [
			{
				name: "Gravethorn helm",
				kind: "armor",
				slot: "head",
				note: "Black steel with swept horns and a visor slit that glows ember-red",
			},
			{
				name: "Gravethorn cuirass",
				kind: "armor",
				slot: "torso",
				note: "Ribbed black plates with jagged edges and ember light in the seams",
			},
			{
				name: "Thorned pauldrons",
				kind: "armor",
				slot: "torso",
				note: "Spiked shoulder plates that curve like thorns",
			},
			{
				name: "Gravethorn left gauntlet",
				kind: "armor",
				slot: "armL",
				note: "Black steel with talon-like finger plates",
			},
			{
				name: "Gravethorn right gauntlet",
				kind: "armor",
				slot: "armR",
				note: "Black steel with talon-like finger plates",
			},
			{
				name: "Gravethorn left greave",
				kind: "armor",
				slot: "legL",
				note: "Black steel with a spiked knee guard",
			},
			{
				name: "Gravethorn right greave",
				kind: "armor",
				slot: "legR",
				note: "Black steel with a spiked knee guard",
			},
			{ name: "Gravethorn boots", kind: "armor", slot: "feet", note: "Plated boots with clawed toes" },
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
	}));
}

/** Kit items whose names are not already in the inventory, so adding a kit twice adds nothing twice. */
export function newKitItems(kit: Kit, regions: Region[], existing: Item[]): Item[] {
	const have = new Set(existing.map((i) => i.name.toLowerCase()));
	return kitItems(kit, regions).filter((i) => !have.has(i.name.toLowerCase()));
}
