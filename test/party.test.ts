import { test } from "node:test";
import assert from "node:assert/strict";
import type { App, Component } from "obsidian";
import { loadModule } from "./harness.ts";
import { makeProfile, type TemplateKey } from "../src/presets.ts";
import type { PartyMember, PartyOptions, PartyView as PartyViewClass } from "../src/party.ts";
import type { Frontmatter, Profile, RegionPatch } from "../src/types.ts";

const { PartyView } = await loadModule<{ PartyView: typeof PartyViewClass }>("src/party.ts");

function member(name: string, template: TemplateKey): Profile {
	return makeProfile(template, name, []);
}

const DATA: Record<string, Frontmatter> = {
	Thorn: { regions: { armL: { status: "lost" }, legR: { status: "wounded" }, head: { status: "bruised" } } },
	Mira: { regions: {} },
};

interface Mounted {
	el: HTMLElement;
	view: PartyViewClass;
	saved: [string, string, RegionPatch][];
}

function mount(members: PartyMember[], title: string | null = null): Mounted {
	const el = document.body.appendChild(document.createElement("div"));
	const saved: [string, string, RegionPatch][] = [];
	const opts: PartyOptions = {
		app: {} as App,
		el,
		title,
		members,
		sourcePath: "x.md",
		component: {} as Component,
		getFrontmatter: (p) => DATA[p.name] ?? {},
		save: (p, regionId, patch) => {
			saved.push([p.name, regionId, patch]);
			return Promise.resolve();
		},
	};
	const view = new PartyView(opts);
	view.draw();
	return { el, view, saved };
}

function must(el: ParentNode, selector: string): HTMLElement {
	const found = el.querySelector<HTMLElement>(selector);
	assert.ok(found, `missing ${selector}`);
	return found;
}

function all(el: ParentNode, selector: string): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>(selector)];
}

const THORN = member("Thorn", "character");
const MIRA = member("Mira", "character");

test("each member gets a tile with a name and a mini figure", () => {
	const { el } = mount([{ profile: THORN }, { profile: MIRA }], "The Company");
	assert.equal(must(el, ".ci-title").textContent, "The Company");
	assert.equal(all(el, ".ci-tile").length, 2);
	assert.equal(all(el, ".ci-tile .ci-mini svg").length, 2);
	assert.deepEqual(
		all(el, ".ci-tile-name").map((n) => n.textContent),
		["Thorn", "Mira"],
	);
	assert.match(must(el, ".ci-legend").textContent, /2 members/);
});

test("a tile shows the worst region and the problem counts, or all well", () => {
	const { el } = mount([{ profile: THORN }, { profile: MIRA }]);
	const [thorn, mira] = all(el, ".ci-tile");
	assert.ok(thorn && mira);
	assert.equal(must(thorn, ".ci-tile-worst").textContent, "Left arm, Lost");
	const counts = must(thorn, ".ci-tile-counts").textContent;
	assert.match(counts, /Bruised 1/);
	assert.match(counts, /Wounded 1/);
	assert.match(counts, /Lost 1/);
	assert.equal(must(mira, ".ci-tile-note").textContent, "All well");
	assert.equal(mira.querySelector(".ci-tile-worst"), null);
});

test("a name with no profile gets a tile that says so", () => {
	const { el } = mount([{ missing: "Ghost" }]);
	const tile = must(el, ".ci-tile");
	assert.equal(tile.classList.contains("is-missing"), true);
	assert.match(tile.textContent, /Ghost/);
	assert.match(tile.textContent, /No profile with this name yet/);
});

test("an empty party explains itself", () => {
	assert.match(must(mount([]).el, ".ci-empty").textContent, /No profiles yet/);
});

test("a tile opens that profile in full and the back button returns to the party", () => {
	const { el } = mount([{ profile: THORN }, { profile: MIRA }], "The Company");
	const [first] = all(el, ".ci-tile");
	assert.ok(first);
	first.click();
	assert.equal(all(el, ".ci-tile").length, 0);
	assert.equal(must(el, ".ci-name").textContent, "Left arm");
	assert.equal(must(el, ".ci-back").textContent, "Back to The Company");
	must(el, ".ci-back").click();
	assert.equal(all(el, ".ci-tile").length, 2);
});

test("a tile can be opened from the keyboard", () => {
	const { el } = mount([{ profile: THORN }]);
	const tile = must(el, ".ci-tile");
	assert.equal(tile.getAttribute("role"), "button");
	assert.equal(tile.getAttribute("tabindex"), "0");
	tile.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
	assert.ok(el.querySelector(".ci-back"));
});

test("edits made in the open profile are saved against that profile", async () => {
	const { el, saved } = mount([{ profile: THORN }]);
	must(el, ".ci-tile").click();
	must(el, ".ci-edit").click();
	must(el, ".ci-form .mod-cta").click();
	await new Promise((r) => setTimeout(r, 0));
	assert.equal(saved.length, 1);
	const [first] = saved;
	assert.ok(first);
	assert.equal(first[0], "Thorn");
	assert.equal(first[1], "armL");
});

test("refresh keeps the open profile instead of returning to the party", () => {
	const { el, view } = mount([{ profile: THORN }]);
	must(el, ".ci-tile").click();
	view.refresh();
	assert.ok(el.querySelector(".ci-back"));
	assert.equal(all(el, ".ci-tile").length, 0);
});
