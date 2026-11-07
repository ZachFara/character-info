import { test } from "node:test";
import assert from "node:assert/strict";
import type { Component } from "obsidian";
import { loadModule } from "./harness.ts";
import { STATE_SETS, TEMPLATES } from "../src/presets.ts";
import type {
	CharacterInfoView as ViewClass,
	ViewOptions,
	drawCreatePrompt as drawCreatePromptFn,
	drawNotice as drawNoticeFn,
} from "../src/render.ts";
import type { TemplateKey } from "../src/presets.ts";
import type { Frontmatter, Item, Profile, RegionPatch } from "../src/types.ts";

const mod = await loadModule<{
	CharacterInfoView: typeof ViewClass;
	drawCreatePrompt: typeof drawCreatePromptFn;
	drawNotice: typeof drawNoticeFn;
}>("src/render.ts");

function profile(key: keyof typeof TEMPLATES): Profile {
	const t = TEMPLATES[key];
	const set = STATE_SETS[t.stateSet];
	return {
		id: "p",
		name: "Test",
		template: key,
		map: t.map,
		states: set.states,
		defaultState: set.defaultState,
		regions: t.regions,
		dataPath: "x.md",
	};
}

function mount(
	p: Profile,
	fm: Frontmatter,
	saved: [string, RegionPatch][] = [],
	saveInventory: ViewOptions["saveInventory"] = null,
): HTMLElement {
	const el = document.body.appendChild(document.createElement("div"));
	const opts: ViewOptions = {
		app: {} as ViewOptions["app"],
		el,
		profile: p,
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: () => fm,
		save: (id, patch) => {
			saved.push([id, patch]);
			return Promise.resolve();
		},
		saveInventory,
	};
	new mod.CharacterInfoView(opts).draw();
	return el;
}

/** The first match for a selector, failing the test if there is none. */
function must(el: ParentNode, selector: string): HTMLElement {
	const found = el.querySelector<HTMLElement>(selector);
	assert.ok(found, `missing ${selector}`);
	return found;
}

function text(el: ParentNode, selector: string): string {
	return must(el, selector).textContent;
}

function click(el: HTMLElement | undefined): void {
	assert.ok(el, "nothing to click");
	el.click();
}

function all(el: ParentNode, selector: string): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>(selector)];
}

test("body profile draws a shape per region that has one and a chip per region", () => {
	const el = mount(profile("body"), {});
	assert.equal(el.querySelectorAll(".ci-region").length, 16);
	assert.equal(el.querySelectorAll(".ci-chip").length, 23);
	assert.ok(el.querySelector(".ci-silhouette"));
});

test("opens on the worst region and colours it by state", () => {
	const fm: Frontmatter = {
		regions: { hips: { status: "hurt", note: "SI joint" }, neck: { status: "watch" } },
	};
	const el = mount(profile("body"), fm);
	assert.equal(text(el, ".ci-name"), "Hips & Low Back");
	assert.equal(text(el, ".ci-note"), "SI joint");
	assert.equal(must(el, '.ci-region[data-region="hips"]').style.getPropertyValue("--ci-c"), "#e5534b");
	assert.match(text(el, ".ci-legend"), /Injured 1/);
	assert.match(text(el, ".ci-legend"), /Needs work 1/);
});

test("clicking a chip selects that region", () => {
	const el = mount(profile("body"), {});
	click(all(el, ".ci-chip").find((c) => c.textContent === "Knees"));
	assert.equal(text(el, ".ci-name"), "Knees");
});

test("character profile uses its own states and a six-part map", () => {
	const el = mount(profile("character"), { regions: { armL: { status: "lost" } } });
	assert.equal(el.querySelectorAll(".ci-region").length, 6);
	assert.equal(text(el, ".ci-name"), "Left arm");
	assert.match(text(el, ".ci-legend"), /Lost 1/);
	assert.match(text(el, ".ci-legend"), /Healthy 5/);
});

test("regions in the default state are drawn neutral and the rest carry their colour", () => {
	const el = mount(profile("character"), { regions: { legR: { status: "wounded" } } });
	assert.equal(all(el, ".ci-region.is-default").length, 5);
	const wounded = must(el, '.ci-region[data-region="legR"]');
	assert.equal(wounded.classList.contains("is-default"), false);
	assert.equal(wounded.style.getPropertyValue("--ci-c"), "#e8883a");
});

test("the selected region is marked on the figure", () => {
	const el = mount(profile("body"), { regions: { hips: { status: "hurt" } } });
	assert.equal(all(el, ".ci-region.is-sel").length, 1);
	assert.equal(must(el, ".ci-region.is-sel").dataset.region, "hips");
});

test("a profile with a map uses the two-column layout and one without uses the full width", () => {
	const withMap = mount(profile("body"), {});
	assert.equal(must(withMap, ".ci-grid").classList.contains("ci-no-map"), false);
	const noMap: Profile = { ...profile("blank"), regions: [{ id: "engine", name: "Engine" }] };
	assert.equal(must(mount(noMap, {}), ".ci-grid").classList.contains("ci-no-map"), true);
});

test("blank profile has no figure and explains itself", () => {
	const el = mount(profile("blank"), {});
	assert.equal(el.querySelector(".ci-fig"), null);
	assert.match(text(el, ".ci-empty"), /no regions yet/);
});

test("an unknown stored status shows a warning, not a crash", () => {
	const el = mount(profile("body"), { regions: { head: { status: "great" } } });
	click(must(el, ".ci-chip"));
	assert.match(text(el, ".ci-warn"), /great/);
});

test("editing saves the chosen state and text, and history shows", async () => {
	const saved: [string, RegionPatch][] = [];
	const fm: Frontmatter = {
		regions: { head: { status: "ok", history: [{ date: "2026-11-01", from: "unknown", to: "ok" }] } },
	};
	const el = mount(profile("body"), fm, saved);
	click(must(el, ".ci-edit"));
	click(all(el, ".ci-state").find((b) => b.textContent === "Injured"));
	(must(el, "textarea.ci-text") as HTMLTextAreaElement).value = "bumped it";
	click(must(el, ".mod-cta"));
	assert.equal(saved.length, 1);
	const [first] = saved;
	assert.ok(first);
	assert.equal(first[0], "head");
	assert.equal(first[1].status, "hurt");
	assert.equal(first[1].note, "bumped it");
	await new Promise((r) => setTimeout(r, 0)); // let the save promise resolve and the card redraw
	assert.equal(el.querySelector(".ci-form"), null);
	assert.match(text(el, ".ci-sec.history"), /History \(1\)/);
	assert.match(text(el, ".ci-sec.history"), /2026-11-01: Untracked to Maintaining/);
});

test("a missing profile offers one button per template and reports the choice", () => {
	const el = document.body.appendChild(document.createElement("div"));
	const chosen: TemplateKey[] = [];
	mod.drawCreatePrompt(el, "Thorn", (t) => chosen.push(t));
	assert.match(text(el, ".ci-create-title"), /Thorn/);
	const buttons = all(el, ".ci-create-row button");
	assert.equal(buttons.length, 3);
	click(buttons.find((b) => b.textContent.includes("Tabletop")));
	assert.deepEqual(chosen, ["character"]);
});

test("a notice replaces the block content with a message", () => {
	const el = document.body.appendChild(document.createElement("div"));
	el.textContent = "old";
	mod.drawNotice(el, "Unknown template");
	assert.equal(text(el, ".ci-notice"), "Unknown template");
	assert.equal(el.textContent, "Unknown template");
});

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

function pick(el: HTMLElement, region: string): void {
	const chip = all(el, ".ci-chip").find((c) => c.textContent === region);
	assert.ok(chip, `no chip ${region}`);
	chip.click();
}

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

test("the card has a row of state buttons that change the state in one click", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), { regions: { armL: { status: "lost" } } }, saved);
	const buttons = all(el, ".ci-quick .ci-state");
	assert.deepEqual(
		buttons.map((b) => b.textContent),
		["Healthy", "Bruised", "Wounded", "Maimed", "Lost"],
	);
	assert.equal(must(el, ".ci-quick .ci-state.is-on").textContent, "Lost");
	click(buttons.find((b) => b.textContent === "Maimed"));
	assert.deepEqual(saved, [["armL", { status: "maimed" }]]);
});

test("clicking the state a region is already in saves nothing", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), { regions: { armL: { status: "lost" } } }, saved);
	click(all(el, ".ci-quick .ci-state").find((b) => b.textContent === "Lost"));
	assert.equal(saved.length, 0);
});

test("the quick row is not shown while editing, where the form has its own state buttons", () => {
	const el = mount(profile("character"), {});
	click(must(el, ".ci-edit"));
	assert.equal(el.querySelector(".ci-quick"), null);
	assert.equal(all(el, ".ci-form .ci-state").length, 5);
});

const NOTED: Frontmatter = {
	regions: {
		head: { status: "bruised", doing: ["Rest", "Ice"], fix: ["See a doctor"], links: ["[[Head injuries]]"] },
	},
};

test("each list item has a cross that saves the list without it", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), NOTED, saved);
	pick(el, "Head");
	const rows = all(el, ".ci-sec.doing li");
	assert.equal(rows.length, 2);
	click(must(rows[0] ?? el, ".ci-li-x"));
	assert.deepEqual(saved, [["head", { doing: ["Ice"] }]]);
});

test("the quick add row adds to the chosen list and keeps what was there", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), NOTED, saved);
	pick(el, "Head");
	const input = must(el, ".ci-quick-add input") as HTMLInputElement;
	input.value = "Stretch";
	click(must(el, ".ci-quick-add button"));
	(must(el, ".ci-quick-add select") as HTMLSelectElement).value = "fix";
	input.value = "Book a scan";
	input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	assert.deepEqual(saved, [
		["head", { doing: ["Rest", "Ice", "Stretch"] }],
		["head", { fix: ["See a doctor", "Book a scan"] }],
	]);
});

test("a link added through the quick row is stored as a wikilink", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), NOTED, saved);
	pick(el, "Head");
	(must(el, ".ci-quick-add select") as HTMLSelectElement).value = "links";
	(must(el, ".ci-quick-add input") as HTMLInputElement).value = "Concussion rules";
	click(must(el, ".ci-quick-add button"));
	assert.deepEqual(saved, [["head", { links: ["[[Head injuries]]", "[[Concussion rules]]"] }]]);
});

test("an empty quick add saves nothing", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), NOTED, saved);
	pick(el, "Head");
	click(must(el, ".ci-quick-add button"));
	assert.equal(saved.length, 0);
});
