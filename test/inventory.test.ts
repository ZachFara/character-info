import { test } from "node:test";
import assert from "node:assert/strict";
import { all, mount, must, pick, profile, text } from "./view-helpers.ts";
import type { Frontmatter, Item } from "../src/types.ts";

const SWORD: Item = { name: "Longsword", kind: "weapon", qty: 1, note: "Steel", region: "armR" };
const VEST: Item = { name: "[[Plate carrier]]", kind: "armor", qty: 1, note: "", region: null };
const WATER: Item = { name: "Water", kind: "gear", qty: 3, note: "1 L bottles", region: null };

function mountInventory(items: Item[]): { el: HTMLElement; writes: Item[][] } {
	const writes: Item[][] = [];
	const fm: Frontmatter = { inventory: items.map((i) => ({ ...i })) };
	const el = mount(profile("character"), fm, [], (next) => {
		writes.push(next);
		return Promise.resolve();
	});
	return { el, writes };
}

test("the inventory panel is hidden when the feature is off", () => {
	assert.equal(mount(profile("character"), { inventory: [SWORD] }).querySelector(".ci-inventory"), null);
});

test("an empty inventory says so and offers a way to add", () => {
	const { el } = mountInventory([]);
	assert.match(text(el, ".ci-inv-count"), /0 items/);
	assert.match(text(el, ".ci-inventory .ci-empty"), /Nothing carried yet/);
	assert.ok(el.querySelector(".ci-item-add input"));
});

test("items are grouped by kind with their quantity, note and region", () => {
	const { el } = mountInventory([WATER, SWORD, VEST]);
	assert.deepEqual(
		all(el, ".ci-inv-group .ci-sec-title").map((t) => t.textContent),
		["Weapons", "Armor", "Gear"],
	);
	const [sword] = all(el, ".ci-inv-group.weapon .ci-item");
	assert.ok(sword);
	assert.equal(text(sword, ".ci-item-name"), "Longsword");
	assert.equal(text(sword, ".ci-item-note"), "Steel");
	assert.equal(text(sword, ".ci-item-region"), "Right arm");
	assert.equal(text(must(el, ".ci-inv-group.gear"), ".ci-item-n"), "3");
	assert.equal(text(must(el, ".ci-inv-group.armor"), ".ci-item-name"), "[[Plate carrier]]");
});

test("the quantity buttons change the count and cannot go below one", () => {
	const { el, writes } = mountInventory([WATER, SWORD]);
	const gear = must(el, ".ci-inv-group.gear");
	const [minus, plus] = all(gear, ".ci-item-qty button");
	assert.ok(minus && plus);
	plus.click();
	minus.click();
	assert.deepEqual(
		writes.map((w) => w.find((i) => i.name === "Water")?.qty),
		[4, 2],
	);
	const sword = all(el, ".ci-inv-group.weapon .ci-item-qty button")[0];
	assert.ok(sword);
	assert.equal((sword as HTMLButtonElement).disabled, true);
});

test("removing an item writes the list without it", () => {
	const { el, writes } = mountInventory([WATER, SWORD]);
	must(must(el, ".ci-inv-group.weapon"), ".ci-item > .ci-inv-btn").click();
	assert.deepEqual(
		writes[0]?.map((i) => i.name),
		["Water"],
	);
});

test("adding an item uses the chosen name, note, kind and region", () => {
	const { el, writes } = mountInventory([WATER]);
	const [name, note] = all(el, ".ci-item-add input");
	const [kind, region] = all(el, ".ci-item-add select");
	assert.ok(name && note && kind && region);
	(name as HTMLInputElement).value = "  Kite shield ";
	(note as HTMLInputElement).value = "Painted";
	(kind as HTMLSelectElement).value = "armor";
	(region as HTMLSelectElement).value = "armL";
	must(el, ".ci-item-add .mod-cta").click();
	const [written] = writes;
	assert.ok(written);
	assert.equal(written.length, 2);
	assert.deepEqual(written.at(-1), {
		name: "Kite shield",
		kind: "armor",
		qty: 1,
		note: "Painted",
		region: "armL",
	});
});

test("an empty name adds nothing", () => {
	const { el, writes } = mountInventory([]);
	must(el, ".ci-item-add .mod-cta").click();
	assert.equal(writes.length, 0);
});

test("pressing Enter in the name box adds the item as carried gear by default", () => {
	const { el, writes } = mountInventory([]);
	const name = must(el, ".ci-item-add input") as HTMLInputElement;
	name.value = "Rope";
	name.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	const [written] = writes;
	assert.ok(written);
	assert.deepEqual(written[0], { name: "Rope", kind: "gear", qty: 1, note: "", region: null });
});

test("the card for a region lists what is worn or held there when the inventory is on", () => {
	const { el } = mountInventory([SWORD, WATER, VEST]);
	pick(el, "Right arm");
	assert.equal(text(el, ".ci-sec.worn .ci-sec-title"), "Worn and held");
	assert.equal(text(el, ".ci-sec.worn li"), "Longsword · Steel");
	assert.equal(el.querySelector(".ci-empty"), null);
});

test("a region with nothing on it has no worn section, and the inventory being off hides it", () => {
	const { el } = mountInventory([SWORD]);
	pick(el, "Left leg");
	assert.equal(el.querySelector(".ci-sec.worn"), null);
	const off = mount(profile("character"), { inventory: [SWORD] });
	pick(off, "Right arm");
	assert.equal(off.querySelector(".ci-sec.worn"), null);
});

test("the kit row offers every kit and adds the chosen one placed on the profile's regions", () => {
	const { el, writes } = mountInventory([WATER]);
	const pickKit = must(el, ".ci-kit-row select") as HTMLSelectElement;
	assert.deepEqual(
		[...pickKit.options].map((o) => o.value),
		["soldier", "knight", "gravethorn"],
	);
	pickKit.value = "knight";
	must(el, ".ci-kit-row button").click();
	const [written] = writes;
	assert.ok(written);
	assert.equal(written[0]?.name, "Water");
	assert.equal(written.find((i) => i.name === "Longsword")?.region, "armR");
	assert.equal(written.find((i) => i.name === "Left greave")?.region, "legL");
});

test("adding a kit skips pieces that are already in the inventory", () => {
	const kit: Item[] = [{ name: "Longsword", kind: "weapon", qty: 1, note: "", region: "armR" }];
	const { el, writes } = mountInventory(kit);
	const pickKit = must(el, ".ci-kit-row select") as HTMLSelectElement;
	pickKit.value = "knight";
	must(el, ".ci-kit-row button").click();
	assert.equal(writes.length, 1);
	assert.equal(writes[0]?.length, 13);
});
