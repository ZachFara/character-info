import type { App, Component } from "obsidian";
import { summarizeProfile } from "./data.ts";
import { CharacterInfoView, drawMiniFigure } from "./render.ts";
import type { MapPreset } from "./presets.ts";
import type { Frontmatter, Item, Profile, RegionPatch } from "./types.ts";

/** A party member is a known profile, or a name that has no profile yet. */
export type PartyMember = { profile: Profile } | { missing: string };

export interface PartyOptions {
	app: App;
	el: HTMLElement;
	title: string | null;
	members: PartyMember[];
	sourcePath: string;
	component: Component;
	getFrontmatter: (profile: Profile) => Frontmatter;
	save: (profile: Profile, regionId: string, patch: RegionPatch) => Promise<void>;
	/** The inventory writer for a profile, or null when the inventory feature is off. */
	saveInventory: (profile: Profile) => ((items: Item[]) => Promise<void>) | null;
	/** The map loaded from an SVG file for a profile that uses one. */
	mapFor?: (profile: Profile) => MapPreset | undefined;
}

/** Several profiles side by side. A tile opens that profile in full, with a way back. */
export class PartyView {
	private focusedId: string | null = null;
	private focused: CharacterInfoView | null = null;

	constructor(private readonly o: PartyOptions) {}

	/** Draws the party grid, or the focused profile when one is open. */
	draw(): void {
		this.o.el.empty();
		const focus = this.o.members.find(
			(m): m is { profile: Profile } => "profile" in m && m.profile.id === this.focusedId,
		);
		if (focus) this.drawFocused(focus.profile);
		else this.drawGrid();
	}

	/** Redraws for new data without losing the open profile or its edit state. */
	refresh(): void {
		if (this.focused) this.focused.draw();
		else this.draw();
	}

	private drawGrid(): void {
		this.focused = null;
		const root = this.o.el.createDiv({ cls: "character-info ci-party" });
		const head = root.createDiv({ cls: "ci-head" });
		head.createEl("h3", { cls: "ci-title", text: this.o.title ?? "Party" });
		head.createDiv({ cls: "ci-legend", text: `${String(this.o.members.length)} members` });
		const tiles = root.createDiv({ cls: "ci-tiles" });
		if (!this.o.members.length) {
			tiles.createDiv({
				cls: "ci-empty",
				text: "No profiles yet. Write a character-info block, or run “New profile”.",
			});
		}
		for (const m of this.o.members) {
			if ("profile" in m) this.drawTile(tiles, m.profile);
			else this.drawMissing(tiles, m.missing);
		}
	}

	private drawMissing(tiles: HTMLElement, name: string): void {
		const tile = tiles.createDiv({ cls: "ci-tile is-missing" });
		const body = tile.createDiv({ cls: "ci-tile-body" });
		body.createDiv({ cls: "ci-tile-name", text: name });
		body.createDiv({
			cls: "ci-tile-note",
			text: "No profile with this name yet. Write a character-info block for it, or run “New profile”.",
		});
	}

	private drawTile(tiles: HTMLElement, profile: Profile): void {
		const fm = this.o.getFrontmatter(profile);
		const tile = tiles.createDiv({ cls: "ci-tile", attr: { role: "button", tabindex: "0" } });
		const open = (): void => {
			this.focusedId = profile.id;
			this.draw();
		};
		tile.addEventListener("click", open);
		tile.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				open();
			}
		});
		drawMiniFigure(tile, profile, fm, this.o.mapFor?.(profile));
		const body = tile.createDiv({ cls: "ci-tile-body" });
		body.createDiv({ cls: "ci-tile-name", text: profile.name });
		this.drawSummary(body, profile, fm);
	}

	private drawSummary(body: HTMLElement, profile: Profile, fm: Frontmatter): void {
		const { problems, worst } = summarizeProfile(profile, fm);
		if (!worst) {
			body.createDiv({ cls: "ci-tile-note", text: "All well" });
			return;
		}
		const line = body.createDiv({ cls: "ci-tile-worst" });
		line.style.setProperty("--ci-c", worst.state.color);
		line.createEl("i", { cls: "ci-dot" });
		line.appendText(`${worst.region.name}, ${worst.state.label}`);
		const counts = body.createDiv({ cls: "ci-tile-counts" });
		for (const { state, count } of problems) {
			const item = counts.createSpan();
			item.style.setProperty("--ci-c", state.color);
			item.createEl("i", { cls: "ci-dot" });
			item.appendText(`${state.label} `);
			item.createEl("b", { text: String(count) });
		}
	}

	private drawFocused(profile: Profile): void {
		const wrap = this.o.el.createDiv({ cls: "ci-party-focus" });
		const back = wrap.createEl("button", { cls: "ci-back", text: `Back to ${this.o.title ?? "party"}` });
		back.addEventListener("click", () => {
			this.focusedId = null;
			this.draw();
		});
		const holder = wrap.createDiv();
		this.focused = new CharacterInfoView({
			app: this.o.app,
			el: holder,
			profile,
			sourcePath: this.o.sourcePath,
			component: this.o.component,
			getFrontmatter: () => this.o.getFrontmatter(profile),
			save: (regionId, patch) => this.o.save(profile, regionId, patch),
			saveInventory: this.o.saveInventory(profile),
			...(this.o.mapFor?.(profile) ? { map: this.o.mapFor(profile) } : {}),
		});
		this.focused.draw();
	}
}
