// Shared helpers for the UI tests: the loaded view module, fixtures and DOM shortcuts.
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
import type { Frontmatter, Profile, RegionPatch } from "../src/types.ts";

export const mod = await loadModule<{
	CharacterInfoView: typeof ViewClass;
	drawCreatePrompt: typeof drawCreatePromptFn;
	drawNotice: typeof drawNoticeFn;
}>("src/render.ts");

export function profile(key: keyof typeof TEMPLATES): Profile {
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
		// Off by default so the other tests do not depend on today's date. Review tests turn it on.
		reviewAfterDays: 0,
	};
}

export function mount(
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
export function must(el: ParentNode, selector: string): HTMLElement {
	const found = el.querySelector<HTMLElement>(selector);
	assert.ok(found, `missing ${selector}`);
	return found;
}

export function text(el: ParentNode, selector: string): string {
	return must(el, selector).textContent;
}

export function click(el: HTMLElement | undefined): void {
	assert.ok(el, "nothing to click");
	el.click();
}

export function all(el: ParentNode, selector: string): HTMLElement[] {
	return [...el.querySelectorAll<HTMLElement>(selector)];
}

export function pick(el: HTMLElement, region: string): void {
	const chip = all(el, ".ci-chip").find((c) => c.textContent === region);
	assert.ok(chip, `no chip ${region}`);
	chip.click();
}
