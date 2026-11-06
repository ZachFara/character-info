import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomHelpers } from "./obsidian-stub.js";
import { STATE_SETS, TEMPLATES } from "../src/presets.js";

// Bundle render.js with `obsidian` pointed at the stub, then import it under jsdom.
const dir = mkdtempSync(join(tmpdir(), "character-info-"));
const out = join(dir, "render.mjs");
await build({
	entryPoints: ["src/render.js"], bundle: true, format: "esm", outfile: out, logLevel: "silent",
	alias: { obsidian: new URL("./obsidian-stub.js", import.meta.url).pathname },
});

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser });
installDomHelpers(dom.window);
const { renderCharacterInfo } = await import(pathToFileURL(out).href);

function profile(templateKey) {
	const t = TEMPLATES[templateKey];
	const set = STATE_SETS[t.stateSet];
	return { id: "p", name: "Test", map: t.map, states: set.states, defaultState: set.defaultState, regions: t.regions };
}

function mount(p, fm, saved = []) {
	const el = document.body.appendChild(document.createElement("div"));
	const view = renderCharacterInfo({
		app: {}, el, profile: p, sourcePath: "x.md", component: {},
		getFrontmatter: () => fm,
		save: async (id, patch) => { saved.push([id, patch]); },
	});
	return { el, view };
}

test("body profile draws a shape per region and a chip per region", () => {
	const { el } = mount(profile("body"), {});
	assert.equal(el.querySelectorAll(".ci-region").length, 16); // regions that have a shape
	assert.equal(el.querySelectorAll(".ci-chip").length, 23);
	assert.ok(el.querySelector(".ci-silhouette"));
});

test("opens on the worst region and colours it by state", () => {
	const fm = { regions: { hips: { status: "hurt", note: "SI joint" }, neck: { status: "watch" } } };
	const { el } = mount(profile("body"), fm);
	assert.equal(el.querySelector(".ci-name").textContent, "Hips & Low Back");
	assert.equal(el.querySelector(".ci-note").textContent, "SI joint");
	const hips = el.querySelector('.ci-region[data-region="hips"]');
	assert.equal(hips.style.fill, "#e5534b");
	const legend = el.querySelector(".ci-legend").textContent;
	assert.match(legend, /Injured 1/);
	assert.match(legend, /Needs work 1/);
});

test("clicking a chip selects that region", () => {
	const { el } = mount(profile("body"), {});
	const chip = [...el.querySelectorAll(".ci-chip")].find((c) => c.textContent === "Knees");
	chip.click();
	assert.equal(el.querySelector(".ci-name").textContent, "Knees");
});

test("character profile uses its own states and a six-part map", () => {
	const { el } = mount(profile("character"), { regions: { armL: { status: "lost" } } });
	assert.equal(el.querySelectorAll(".ci-region").length, 6);
	assert.equal(el.querySelector(".ci-name").textContent, "Left arm");
	assert.match(el.querySelector(".ci-legend").textContent, /Lost 1/);
	assert.match(el.querySelector(".ci-legend").textContent, /Healthy 5/);
});

test("blank profile has no figure and explains itself", () => {
	const { el } = mount(profile("blank"), {});
	assert.equal(el.querySelector(".ci-fig"), null);
	assert.match(el.querySelector(".ci-empty").textContent, /no regions yet/);
});

test("an unknown stored status shows a warning, not a crash", () => {
	const { el } = mount(profile("body"), { regions: { head: { status: "great" } } });
	el.querySelector('.ci-chip').click();
	assert.match(el.querySelector(".ci-warn").textContent, /great/);
});

test("editing saves the chosen state and text, and history shows", async () => {
	const saved = [];
	const fm = { regions: { head: { status: "ok", history: [{ date: "2026-11-01", from: "unknown", to: "ok" }] } } };
	const { el } = mount(profile("body"), fm, saved);
	el.querySelector(".ci-edit").click();
	[...el.querySelectorAll(".ci-state")].find((b) => b.textContent === "Injured").click();
	el.querySelector("textarea.ci-text").value = "bumped it";
	el.querySelector(".mod-cta").click();
	assert.equal(saved.length, 1);
	assert.equal(saved[0][0], "head");
	assert.equal(saved[0][1].status, "hurt");
	assert.equal(saved[0][1].note, "bumped it");
	await new Promise((r) => setTimeout(r, 0)); // let the save promise resolve and the card redraw
	assert.equal(el.querySelector(".ci-form"), null);
	assert.match(el.querySelector(".ci-sec.history").textContent, /History \(1\)/);
	assert.match(el.querySelector(".ci-sec.history").textContent, /2026-11-01: Untracked to Maintaining/);
});
