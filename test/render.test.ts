import { test } from "node:test";
import assert from "node:assert/strict";
import type { Component } from "obsidian";
import { all, click, mod, mount, must, pick, profile, text } from "./view-helpers.ts";
import type { TemplateKey } from "../src/presets.ts";
import type { ViewOptions } from "../src/render.ts";
import type { Frontmatter, Profile, RegionPatch } from "../src/types.ts";

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
	const noMap: Profile = { ...profile("blank"), regions: [{ id: "tail", name: "Tail" }] };
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

test("the card has a row of state buttons that change the state in one click", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mount(profile("character"), { regions: { armL: { status: "lost" } } }, saved);
	const buttons = all(el, ".ci-quick .ci-state");
	assert.deepEqual(
		buttons.map((b) => b.textContent),
		["Healthy", "Bruised", "Wounded", "Severe", "Lost"],
	);
	assert.equal(must(el, ".ci-quick .ci-state.is-on").textContent, "Lost");
	click(buttons.find((b) => b.textContent === "Severe"));
	assert.deepEqual(saved, [["armL", { status: "severe" }]]);
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

test("a plus chip appears only when the block can be edited, and Enter adds the typed region", () => {
	const added: string[] = [];
	const el = document.body.appendChild(document.createElement("div"));
	new mod.CharacterInfoView({
		app: {} as ViewOptions["app"],
		el,
		profile: profile("character"),
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: () => ({}),
		save: () => Promise.resolve(),
		saveInventory: null,
		addRegion: (name) => added.push(name),
	}).draw();
	click(must(el, ".ci-chip-add"));
	const input = must(el, ".ci-add-region") as HTMLInputElement;
	assert.equal(el.querySelector(".ci-chip-add"), null);
	input.value = "  Tail ";
	input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	assert.deepEqual(added, ["Tail"]);
	assert.equal(mount(profile("character"), {}).querySelector(".ci-chip-add"), null);
});

test("Escape puts the plus chip back and an empty box adds nothing", () => {
	const added: string[] = [];
	const el = document.body.appendChild(document.createElement("div"));
	new mod.CharacterInfoView({
		app: {} as ViewOptions["app"],
		el,
		profile: profile("character"),
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: () => ({}),
		save: () => Promise.resolve(),
		saveInventory: null,
		addRegion: (name) => added.push(name),
	}).draw();
	click(must(el, ".ci-chip-add"));
	const input = must(el, ".ci-add-region") as HTMLInputElement;
	input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	assert.equal(added.length, 0);
	input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	assert.ok(el.querySelector(".ci-chip-add"));
	assert.equal(el.querySelector(".ci-add-region"), null);
});

function mountOn(day: string, fm: Frontmatter, saved: [string, RegionPatch][] = []): HTMLElement {
	const el = document.body.appendChild(document.createElement("div"));
	new mod.CharacterInfoView({
		app: {} as ViewOptions["app"],
		el,
		profile: { ...profile("character"), reviewAfterDays: 30 },
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: () => fm,
		save: (id, patch) => {
			saved.push([id, patch]);
			return Promise.resolve();
		},
		saveInventory: null,
		today: () => day,
	}).draw();
	return el;
}

const STALE: Frontmatter = {
	regions: {
		armL: { status: "wounded", reviewed: "2026-09-01" },
		legR: { status: "bruised", reviewed: "2026-11-01" },
	},
};

test("a region not touched for too long shows Review due with how long, and its chip is marked", () => {
	const el = mountOn("2026-11-06", STALE);
	pick(el, "Left arm");
	assert.equal(text(el, ".ci-review-text"), "Review due. Not reviewed in 66 days.");
	assert.deepEqual(
		all(el, ".ci-chip.is-due").map((c) => c.textContent),
		["Left arm"],
	);
	assert.match(text(el, ".ci-due-count"), /1 to review/);
});

test("Mark reviewed saves a review-only edit", () => {
	const saved: [string, RegionPatch][] = [];
	const el = mountOn("2026-11-06", STALE, saved);
	pick(el, "Left arm");
	click(all(el, ".ci-review button").find((b) => b.textContent === "Mark reviewed"));
	assert.deepEqual(saved, [["armL", { reviewed: true }]]);
});

test("a recently touched region and a region never set show no review badge", () => {
	const el = mountOn("2026-11-06", STALE);
	pick(el, "Right leg");
	assert.equal(el.querySelector(".ci-review"), null);
	pick(el, "Head");
	assert.equal(el.querySelector(".ci-review"), null);
});

test("a non-default region that was never reviewed says so", () => {
	const el = mountOn("2026-11-06", { regions: { head: { status: "wounded" } } });
	pick(el, "Head");
	assert.equal(text(el, ".ci-review-text"), "Review due. Never reviewed.");
});

test("a view given a map from an SVG file draws that map's shapes and offers no armor view", () => {
	const el = document.body.appendChild(document.createElement("div"));
	const kaelMap = {
		label: "Kael",
		viewBox: "0 0 100 220",
		shapes: {
			head: '<circle cx="50" cy="25" r="18"/>',
			left_wing: '<path d="M60 60 L98 40 L70 110 Z"/>',
		},
	};
	new mod.CharacterInfoView({
		app: {} as ViewOptions["app"],
		el,
		profile: {
			...profile("blank"),
			map: "kael.svg",
			regions: [
				{ id: "head", name: "Head" },
				{ id: "left_wing", name: "Left wing" },
			],
		},
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: () => ({ inventory: [{ name: "Helm", kind: "armor", look: "gravethorn:helm" }] }),
		save: () => Promise.resolve(),
		saveInventory: () => Promise.resolve(),
		map: kaelMap,
	}).draw();
	assert.equal(must(el, ".ci-fig svg").getAttribute("viewBox"), "0 0 100 220");
	assert.equal(all(el, ".ci-region").length, 2);
	assert.equal(el.querySelector(".ci-viewtoggle"), null);
});
