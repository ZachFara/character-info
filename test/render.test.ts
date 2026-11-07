import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { Component } from "obsidian";
import { installDomHelpers } from "./obsidian-stub.ts";
import { STATE_SETS, TEMPLATES } from "../src/presets.ts";
import type {
	CharacterInfoView as ViewClass,
	ViewOptions,
	drawCreatePrompt as drawCreatePromptFn,
	drawNotice as drawNoticeFn,
} from "../src/render.ts";
import type { TemplateKey } from "../src/presets.ts";
import type { Frontmatter, Profile, RegionPatch } from "../src/types.ts";

// Bundle render.ts with `obsidian` pointed at the stub, then import it under jsdom.
const out = join(mkdtempSync(join(tmpdir(), "character-info-")), "render.cjs");
await build({
	entryPoints: ["src/render.ts"],
	bundle: true,
	format: "cjs",
	outfile: out,
	logLevel: "silent",
	alias: { obsidian: new URL("./obsidian-stub.ts", import.meta.url).pathname },
});

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	activeDocument: dom.window.document,
	DOMParser: dom.window.DOMParser,
});
installDomHelpers(dom.window as unknown as Window & typeof globalThis);
const mod = createRequire(import.meta.url)(out) as {
	CharacterInfoView: typeof ViewClass;
	drawCreatePrompt: typeof drawCreatePromptFn;
	drawNotice: typeof drawNoticeFn;
};

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

function mount(p: Profile, fm: Frontmatter, saved: [string, RegionPatch][] = []): HTMLElement {
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
