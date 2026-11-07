import { test } from "node:test";
import assert from "node:assert/strict";
import { ARMOR_SETS, armorMarkup } from "../src/armor-art.ts";
import { KITS, isKitKey, kitItems, newKitItems, type KitKey } from "../src/kits.ts";
import { TEMPLATES } from "../src/presets.ts";
import type { Item } from "../src/types.ts";

const KEYS = Object.keys(KITS) as KitKey[];
const character = TEMPLATES.character.regions;
const body = TEMPLATES.body.regions;

function regionOf(items: Item[], name: string): string | null {
	const found = items.find((i) => i.name === name);
	assert.ok(found, `no item ${name}`);
	return found.region;
}

test("there are two kits, a modern soldier and Gravethorn, each with weapons and armor", () => {
	assert.deepEqual(KEYS, ["soldier", "gravethorn"]);
	for (const key of KEYS) {
		const kinds = new Set(KITS[key].items.map((i) => i.kind));
		assert.equal(kinds.has("weapon"), true, key);
		assert.equal(kinds.has("armor"), true, key);
	}
	assert.equal(isKitKey("gravethorn"), true);
	assert.equal(isKitKey("knight"), false);
});

test("every armor piece in a kit has a drawing, and every drawing is used", () => {
	for (const key of KEYS) {
		for (const item of KITS[key].items.filter((i) => i.kind === "armor")) {
			assert.ok(item.look, `${item.name} has no look`);
			assert.equal(armorMarkup([item.look]).length, 1, `${item.name} look ${item.look} draws nothing`);
		}
	}
	const used = new Set(KEYS.flatMap((k) => KITS[k].items.flatMap((i) => (i.look ? [i.look] : []))));
	for (const [set, pieces] of Object.entries(ARMOR_SETS)) {
		for (const piece of Object.keys(pieces)) assert.ok(used.has(`${set}:${piece}`), `${set}:${piece} unused`);
	}
});

test("item names are unique across the kits", () => {
	const names = KEYS.flatMap((k) => KITS[k].items.map((i) => i.name.toLowerCase()));
	assert.equal(new Set(names).size, names.length);
});

test("kit text uses no protected names from other works", () => {
	const banned =
		/daedric|daedra|skyrim|oblivion|elder scrolls|mehrunes|bethesda|kevlar|molle|\bm4\b|\bak-?47\b|glock/i;
	for (const key of KEYS) {
		const text = [KITS[key].label, ...KITS[key].items.flatMap((i) => [i.name, i.note])].join("\n");
		assert.doesNotMatch(text, banned, key);
	}
});

test("on the character figure, pieces land on the matching limbs and keep their drawing", () => {
	const items = kitItems(KITS.gravethorn, character);
	assert.equal(regionOf(items, "Gravethorn helm"), "head");
	assert.equal(regionOf(items, "Gravethorn cuirass"), "torso");
	assert.equal(regionOf(items, "Gravethorn right gauntlet"), "armR");
	assert.equal(regionOf(items, "Gravethorn left greave"), "legL");
	assert.equal(regionOf(items, "Gravethorn boots"), null);
	assert.equal(items.find((i) => i.name === "Gravethorn boots")?.look, "gravethorn:boots");
	assert.equal(items.find((i) => i.name === "Thornfang dagger")?.look, null);
});

test("on the body figure, pieces fall back to the nearest region it has", () => {
	const items = kitItems(KITS.soldier, body);
	assert.equal(regionOf(items, "Combat helmet"), "head");
	assert.equal(regionOf(items, "Plate carrier"), "chest");
	assert.equal(regionOf(items, "Assault rifle"), "arms");
	assert.equal(regionOf(items, "Combat boots"), "feet");
	assert.equal(regionOf(items, "Radio"), null);
});

test("quantities carry through and default to one", () => {
	const items = kitItems(KITS.soldier, character);
	assert.equal(items.find((i) => i.name === "Spare magazines")?.qty, 6);
	assert.equal(items.find((i) => i.name === "Radio")?.qty, 1);
});

test("adding a kit twice adds nothing the second time and only what is missing otherwise", () => {
	const first = newKitItems(KITS.soldier, character, []);
	assert.equal(first.length, KITS.soldier.items.length);
	assert.equal(newKitItems(KITS.soldier, character, first).length, 0);
	const missing = newKitItems(
		KITS.soldier,
		character,
		first.filter((i) => i.name !== "Radio"),
	);
	assert.deepEqual(
		missing.map((i) => i.name),
		["Radio"],
	);
});

test("armor drawings come out in paint order with the helm last, and unknown looks are skipped", () => {
	const order = armorMarkup([
		"gravethorn:helm",
		"nonsense:helm",
		"military:boots",
		"gravethorn:wings",
		"military:chest",
	]);
	assert.equal(order.length, 3);
	assert.equal(order[0], ARMOR_SETS.military?.boots);
	assert.equal(order[2], ARMOR_SETS.gravethorn?.helm);
});

test("left pieces are the right pieces mirrored across the figure's centre", () => {
	for (const set of ["military", "gravethorn"]) {
		const pieces = ARMOR_SETS[set] ?? {};
		assert.equal(pieces.gauntletL, `<g transform="matrix(-1 0 0 1 240 0)">${pieces.gauntletR ?? ""}</g>`);
		assert.equal(pieces.greaveL, `<g transform="matrix(-1 0 0 1 240 0)">${pieces.greaveR ?? ""}</g>`);
	}
});
