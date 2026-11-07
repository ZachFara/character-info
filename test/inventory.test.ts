import { test } from "node:test";
import assert from "node:assert/strict";
import { all, click, mount, must, pick, profile, text } from "./view-helpers.ts";
import type { Frontmatter, Item } from "../src/types.ts";

const SWORD: Item = { name: "Longsword", kind: "weapon", qty: 1, note: "Steel", region: "armR", look: null };
const VEST: Item = { name: "[[Plate carrier]]", kind: "armor", qty: 1, note: "", region: null, look: null };
const WATER: Item = { name: "Water", kind: "gear", qty: 3, note: "1 L bottles", region: null, look: null };

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
		look: null,
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
	assert.deepEqual(written[0], { name: "Rope", kind: "gear", qty: 1, note: "", region: null, look: null });
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

test("the kit row offers both kits and adds the chosen one placed on the profile's regions", () => {
	const { el, writes } = mountInventory([WATER]);
	const pickKit = must(el, ".ci-kit-row select") as HTMLSelectElement;
	assert.deepEqual(
		[...pickKit.options].map((o) => o.value),
		["soldier", "gravethorn"],
	);
	pickKit.value = "gravethorn";
	must(el, ".ci-kit-row button").click();
	const [written] = writes;
	assert.ok(written);
	assert.equal(written[0]?.name, "Water");
	assert.equal(written.find((i) => i.name === "Gravethorn greatsword")?.region, "armR");
	const greave = written.find((i) => i.name === "Gravethorn left greave");
	assert.ok(greave);
	assert.equal(greave.region, "legL");
	assert.equal(greave.look, "gravethorn:greaveL");
});

test("adding a kit skips pieces that are already in the inventory", () => {
	const kit: Item[] = [
		{ name: "Gravethorn greatsword", kind: "weapon", qty: 1, note: "", region: "armR", look: null },
	];
	const { el, writes } = mountInventory(kit);
	const pickKit = must(el, ".ci-kit-row select") as HTMLSelectElement;
	pickKit.value = "gravethorn";
	must(el, ".ci-kit-row button").click();
	const [written] = writes;
	assert.equal(writes.length, 1);
	assert.equal(written?.length, 10);
});

const HELM: Item = {
	name: "Gravethorn helm",
	kind: "armor",
	qty: 1,
	note: "",
	region: "head",
	look: "gravethorn:helm",
};
const BOOTS: Item = {
	name: "Combat boots",
	kind: "armor",
	qty: 1,
	note: "",
	region: null,
	look: "military:boots",
};

test("there is no view switch when no armor has a drawing", () => {
	const { el } = mountInventory([SWORD, VEST, WATER]);
	assert.equal(el.querySelector(".ci-viewtoggle"), null);
	assert.equal(el.querySelector(".ci-armor"), null);
});

test("there is no view switch when the inventory is off, even with drawable armor", () => {
	const el = mount(profile("character"), { inventory: [HELM] });
	assert.equal(el.querySelector(".ci-viewtoggle"), null);
});

test("with drawable armor the figure offers Body and Armor and starts on Body", () => {
	const { el } = mountInventory([HELM, BOOTS, SWORD]);
	assert.deepEqual(
		all(el, ".ci-viewtoggle button").map((b) => b.textContent),
		["Body", "Armor"],
	);
	assert.equal(text(el, ".ci-viewtoggle .is-on"), "Body");
	assert.equal(el.querySelector(".ci-armor"), null);
});

test("the Armor view draws the pieces over a neutral body, and Body puts the states back", () => {
	const fm: Frontmatter = { regions: { head: { status: "wounded" } }, inventory: [HELM, BOOTS] };
	const el = mount(profile("character"), fm, [], () => Promise.resolve());
	assert.equal(el.querySelectorAll(".ci-region:not(.is-default)").length, 1);
	click(all(el, ".ci-viewtoggle button").find((b) => b.textContent === "Armor"));
	const armor = must(el, ".ci-armor");
	assert.ok(armor.children.length > 0);
	assert.equal(el.querySelectorAll(".ci-region:not(.is-default)").length, 0);
	assert.equal(text(el, ".ci-viewtoggle .is-on"), "Armor");
	click(all(el, ".ci-viewtoggle button").find((b) => b.textContent === "Body"));
	assert.equal(el.querySelector(".ci-armor"), null);
	assert.equal(el.querySelectorAll(".ci-region:not(.is-default)").length, 1);
});

test("selecting a region keeps the Armor view", () => {
	const { el } = mountInventory([HELM]);
	click(all(el, ".ci-viewtoggle button").find((b) => b.textContent === "Armor"));
	pick(el, "Torso");
	assert.ok(el.querySelector(".ci-armor"));
});
