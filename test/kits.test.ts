import { test } from "node:test";
import assert from "node:assert/strict";
import { KITS, isKitKey, kitItems, newKitItems, type KitKey } from "../src/kits.ts";
import { TEMPLATES } from "../src/presets.ts";
import type { Item } from "../src/types.ts";

const KEYS = Object.keys(KITS) as KitKey[];
const character = TEMPLATES.character.regions;
const body = TEMPLATES.body.regions;

test("there are three kits and each has weapons, armor and gear", () => {
	assert.deepEqual(KEYS, ["soldier", "knight", "gravethorn"]);
	for (const key of KEYS) {
		const kinds = new Set(KITS[key].items.map((i) => i.kind));
		assert.equal(kinds.has("weapon"), true, key);
		assert.equal(kinds.has("armor"), true, key);
	}
	assert.equal(isKitKey("knight"), true);
	assert.equal(isKitKey("nonsense"), false);
});

test("item names are unique inside a kit and across all kits", () => {
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

test("on the character figure, pieces land on the matching limbs", () => {
	const items = kitItems(KITS.knight, character);
	const at = (name: string): string | null => {
		const found = items.find((i) => i.name === name);
		assert.ok(found, `no item ${name}`);
		return found.region;
	};
	assert.equal(at("Great helm"), "head");
	assert.equal(at("Plate cuirass"), "torso");
	assert.equal(at("Right gauntlet"), "armR");
	assert.equal(at("Left gauntlet"), "armL");
	assert.equal(at("Longsword"), "armR");
	assert.equal(at("Kite shield"), "armL");
	assert.equal(at("Left greave"), "legL");
	assert.equal(at("Sabatons"), null);
	assert.equal(at("Rondel dagger"), null);
});

test("on the body figure, pieces fall back to the nearest region it has", () => {
	const items = kitItems(KITS.soldier, body);
	const at = (name: string): string | null => {
		const found = items.find((i) => i.name === name);
		assert.ok(found, `no item ${name}`);
		return found.region;
	};
	assert.equal(at("Combat helmet"), "head");
	assert.equal(at("Plate carrier"), "chest");
	assert.equal(at("Assault rifle"), "arms");
	assert.equal(at("Combat boots"), "feet");
	assert.equal(at("Radio"), null);
});

test("with no regions every piece is simply carried", () => {
	assert.equal(
		kitItems(KITS.gravethorn, []).every((i) => i.region === null),
		true,
	);
});

test("quantities carry through and default to one", () => {
	const items = kitItems(KITS.soldier, character);
	assert.equal(items.find((i) => i.name === "Spare magazines")?.qty, 6);
	assert.equal(items.find((i) => i.name === "Radio")?.qty, 1);
});

test("adding a kit twice adds nothing the second time and only what is missing otherwise", () => {
	const first = newKitItems(KITS.knight, character, []);
	assert.equal(first.length, KITS.knight.items.length);
	assert.equal(newKitItems(KITS.knight, character, first).length, 0);
	const partial: Item[] = first.filter((i) => i.name !== "Longsword");
	const missing = newKitItems(KITS.knight, character, partial);
	assert.deepEqual(
		missing.map((i) => i.name),
		["Longsword"],
	);
});

test("two armor kits can be worn together because their names differ", () => {
	const knight = newKitItems(KITS.knight, character, []);
	const dark = newKitItems(KITS.gravethorn, character, knight);
	assert.equal(dark.length, KITS.gravethorn.items.length);
});
