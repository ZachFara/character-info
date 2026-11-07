import { MarkdownRenderer, type App, type Component } from "obsidian";
import { TEMPLATES, getMap, type MapPreset, type TemplateKey } from "./presets.ts";
import {
	describeItem,
	isUnknownStatus,
	itemsOnRegion,
	pickInitial,
	readInventory,
	readRegion,
	resolveState,
	tally,
	toList,
} from "./data.ts";
import { drawInventory } from "./inventory-view.ts";
import type { Frontmatter, Item, Profile, Region, RegionData, RegionPatch, State } from "./types.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const PIPS = 5;
const HINT = "Select a region";

export interface ViewOptions {
	app: App;
	el: HTMLElement;
	profile: Profile;
	sourcePath: string;
	component: Component;
	/** The profile note's current frontmatter. */
	getFrontmatter: () => Frontmatter;
	/** Writes an edit to the profile note. */
	save: (regionId: string, patch: RegionPatch) => Promise<void>;
	/** Writes the inventory. Null when the inventory feature is off, which hides the panel. */
	saveInventory: ((items: Item[]) => Promise<void>) | null;
}

/** Turns a trusted preset string like `<rect .../>` into SVG nodes. */
function shapeNodes(markup: string): Node[] {
	const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${markup}</svg>`, "image/svg+xml");
	return Array.from(doc.documentElement.childNodes).map((n) => activeDocument.importNode(n, true));
}

function svgGroup(className: string, markup: string[]): SVGGElement {
	const g = activeDocument.createElementNS(SVG_NS, "g");
	g.setAttribute("class", className);
	for (const m of markup) for (const n of shapeNodes(m)) g.appendChild(n);
	return g;
}

/**
 * The figure: a neutral silhouette, then one group per drawn region. Regions in the default state
 * stay neutral so colour lands only on regions that need attention. `decorate` lets the caller
 * add behaviour to each region.
 */
function figureSvg(
	profile: Profile,
	map: MapPreset,
	fm: Frontmatter,
	selected: string | null,
	decorate?: (g: SVGGElement, region: Region) => void,
): SVGSVGElement {
	const svg = activeDocument.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", map.viewBox);
	svg.setAttribute("role", "img");
	svg.setAttribute("aria-label", `${profile.name}, regions coloured by state`);
	const drawn = profile.regions.filter((r) => map.shapes[r.id] !== undefined);
	svg.appendChild(
		svgGroup(
			"ci-silhouette",
			drawn.map((r) => map.shapes[r.id] ?? ""),
		),
	);
	for (const r of drawn) {
		const state = resolveState(profile, readRegion(fm, r.id).status);
		const neutral = state.id === profile.defaultState;
		const cls = "ci-region" + (neutral ? " is-default" : "") + (r.id === selected ? " is-sel" : "");
		const g = svgGroup(cls, [map.shapes[r.id] ?? ""]);
		g.dataset.region = r.id;
		if (!neutral) g.style.setProperty("--ci-c", state.color);
		decorate?.(g, r);
		svg.appendChild(g);
	}
	return svg;
}

/** A small, non-interactive figure for party tiles. Draws nothing when the profile has no map. */
export function drawMiniFigure(parent: HTMLElement, profile: Profile, fm: Frontmatter): void {
	const map = getMap(profile.map);
	if (!profile.regions.some((r) => map.shapes[r.id] !== undefined)) return;
	const fig = parent.createDiv({ cls: "ci-mini" });
	fig.appendChild(figureSvg(profile, map, fm, null));
}

/** A warning or hint in the same card style, used when a block cannot be drawn. */
export function drawNotice(el: HTMLElement, text: string): void {
	el.empty();
	el.createDiv({ cls: "character-info" }).createDiv({ cls: "ci-notice", text });
}

/** Offered when a block names a profile that does not exist yet: one button per template. */
export function drawCreatePrompt(
	el: HTMLElement,
	name: string,
	onCreate: (template: TemplateKey) => void,
): void {
	el.empty();
	const box = el.createDiv({ cls: "character-info ci-create" });
	box.createDiv({ cls: "ci-create-title", text: `There is no profile called “${name}” yet.` });
	box.createDiv({ cls: "ci-create-hint", text: "Create it from a template:" });
	const row = box.createDiv({ cls: "ci-create-row" });
	for (const [key, t] of Object.entries(TEMPLATES) as [TemplateKey, (typeof TEMPLATES)[TemplateKey]][]) {
		const b = row.createEl("button", { text: t.label });
		b.addEventListener("click", () => {
			onCreate(key);
		});
	}
	box.createDiv({
		cls: "ci-create-hint",
		text: "Or add a line like “template: character” to this block to define it in text.",
	});
}

/** One profile drawn as a figure, a detail card and a chip roster. */
export class CharacterInfoView {
	private selected: string | null = null;
	private editing = false;
	private readonly map: MapPreset;

	constructor(private readonly o: ViewOptions) {
		this.map = getMap(o.profile.map);
	}

	/** Redraws everything from the profile note's current data. */
	draw(): void {
		const fm = this.o.getFrontmatter();
		const { profile } = this.o;
		if (!this.selected || !profile.regions.some((r) => r.id === this.selected)) {
			this.selected = pickInitial(profile, fm);
		}
		this.o.el.empty();
		const root = this.o.el.createDiv({ cls: "character-info" });
		this.drawHeader(root, fm);
		const hasMap = profile.regions.some((r) => this.map.shapes[r.id] !== undefined);
		const grid = root.createDiv({ cls: "ci-grid" + (hasMap ? "" : " ci-no-map") });
		if (hasMap) this.drawFigure(grid, fm);
		const side = grid.createDiv({ cls: "ci-side" });
		this.drawCard(side, fm);
		this.drawRoster(side, fm);
		this.drawInventoryPanel(root, fm);
	}

	private drawInventoryPanel(root: HTMLElement, fm: Frontmatter): void {
		const save = this.o.saveInventory;
		if (!save) return;
		drawInventory(root, {
			items: readInventory(fm),
			regions: this.o.profile.regions,
			save,
			markdown: (target, text) => {
				this.markdown(target, text);
			},
		});
	}

	private select(id: string): void {
		this.selected = id;
		this.editing = false;
		this.draw();
	}

	private drawHeader(root: HTMLElement, fm: Frontmatter): void {
		const head = root.createDiv({ cls: "ci-head" });
		head.createEl("h3", { cls: "ci-title", text: this.o.profile.name });
		const legend = head.createDiv({ cls: "ci-legend" });
		const counts = tally(this.o.profile, fm);
		for (const s of this.o.profile.states) {
			const count = counts[s.id] ?? 0;
			const item = legend.createSpan({ cls: count ? "" : "is-zero" });
			item.createEl("i", { cls: "ci-dot" }).style.background = s.color;
			item.appendText(`${s.label} `);
			item.createEl("b", { text: String(count) });
		}
	}

	private drawFigure(grid: HTMLElement, fm: Frontmatter): void {
		const fig = grid.createEl("figure", { cls: "ci-fig" });
		const caption = fig.createEl("figcaption", { text: HINT });
		const svg = figureSvg(this.o.profile, this.map, fm, this.selected, (g, r) => {
			g.addEventListener("click", () => {
				this.select(r.id);
			});
			g.addEventListener("mouseenter", () => {
				caption.textContent = r.name;
			});
			g.addEventListener("mouseleave", () => {
				caption.textContent = HINT;
			});
		});
		fig.insertBefore(svg, caption);
	}

	private drawRoster(side: HTMLElement, fm: Frontmatter): void {
		const roster = side.createDiv({ cls: "ci-roster" });
		for (const r of this.o.profile.regions) {
			const s = resolveState(this.o.profile, readRegion(fm, r.id).status);
			const chip = roster.createEl("button", { cls: "ci-chip" + (r.id === this.selected ? " is-sel" : "") });
			chip.style.setProperty("--ci-c", s.color);
			chip.createEl("i", { cls: "ci-dot" });
			chip.appendText(r.name);
			chip.addEventListener("click", () => {
				this.select(r.id);
			});
		}
	}

	private markdown(target: HTMLElement, text: string): void {
		void MarkdownRenderer.render(this.o.app, text, target, this.o.sourcePath, this.o.component);
	}

	private drawList(card: HTMLElement, title: string, items: string[], cls: string): void {
		if (!items.length) return;
		const sec = card.createDiv({ cls: `ci-sec ${cls}` });
		sec.createDiv({ cls: "ci-sec-title", text: title });
		const ul = sec.createEl("ul");
		for (const item of items) this.markdown(ul.createEl("li"), item);
	}

	private drawCard(side: HTMLElement, fm: Frontmatter): void {
		const card = side.createDiv({ cls: "ci-card" });
		const region = this.o.profile.regions.find((r) => r.id === this.selected);
		if (!region) {
			card.createDiv({
				cls: "ci-empty",
				text: "This profile has no regions yet. Add some in the plugin settings.",
			});
			return;
		}
		const data = readRegion(fm, region.id);
		const state = resolveState(this.o.profile, data.status);
		card.style.setProperty("--ci-c", state.color);
		this.drawCardTop(card, region, data, state);
		if (this.editing) this.drawEditor(card, region, data, state);
		else this.drawDetails(card, data, this.wornOn(region.id, fm));
	}

	private drawCardTop(card: HTMLElement, region: Region, data: RegionData, state: State): void {
		const top = card.createDiv({ cls: "ci-card-top" });
		top.createDiv({ cls: "ci-name", text: region.name });
		const edit = top.createEl("button", { cls: "ci-edit", text: this.editing ? "Cancel" : "Edit" });
		edit.addEventListener("click", () => {
			this.editing = !this.editing;
			this.draw();
		});

		const stat = card.createDiv({ cls: "ci-stat" });
		const label = stat.createSpan();
		label.createEl("i", { cls: "ci-dot" });
		label.appendText(state.label);
		const pips = stat.createSpan({ cls: "ci-pips" });
		for (let i = 0; i < PIPS; i++) pips.createEl("i", { cls: i < state.pips ? "is-on" : "" });

		if (isUnknownStatus(this.o.profile, data.status)) {
			const ids = this.o.profile.states.map((s) => s.id).join(", ");
			card.createDiv({
				cls: "ci-warn",
				text: `Status "${data.status ?? ""}" is not one of ${ids}, so it shows as ${state.label}.`,
			});
		}
	}

	/** Items worn or held on a region, as lines of text. Empty when the inventory feature is off. */
	private wornOn(regionId: string, fm: Frontmatter): string[] {
		if (!this.o.saveInventory) return [];
		return itemsOnRegion(readInventory(fm), regionId).map(describeItem);
	}

	private drawDetails(card: HTMLElement, data: RegionData, worn: string[]): void {
		if (data.note) this.markdown(card.createDiv({ cls: "ci-note" }), data.note);
		this.drawList(card, "Worn and held", worn, "worn");
		this.drawList(card, "Doing", data.doing, "doing");
		this.drawList(card, "To fix", data.fix, "fix");
		this.drawList(card, "Notes", data.links, "links");
		this.drawHistory(card, data);
		if (!data.note && !data.doing.length && !data.fix.length && !data.links.length && !worn.length) {
			card.createDiv({ cls: "ci-empty", text: "Nothing logged yet." });
		}
	}

	private drawHistory(card: HTMLElement, data: RegionData): void {
		if (!data.history.length) return;
		const details = card.createEl("details", { cls: "ci-sec history" });
		details.createEl("summary", { text: `History (${String(data.history.length)})` });
		const ul = details.createEl("ul");
		const name = (id: string): string => this.o.profile.states.find((s) => s.id === id)?.label ?? id;
		for (const h of [...data.history].reverse()) {
			ul.createEl("li", { text: `${h.date}: ${name(h.from)} to ${name(h.to)}` });
		}
	}

	private drawEditor(card: HTMLElement, region: Region, data: RegionData, state: State): void {
		const form = card.createDiv({ cls: "ci-form" });
		const chosen = this.drawStatePicker(form, state);
		const field = (title: string, value: string, placeholder: string, rows: number): HTMLTextAreaElement => {
			form.createEl("label", { cls: "ci-label", text: title });
			const ta = form.createEl("textarea", { cls: "ci-text", attr: { rows: String(rows), placeholder } });
			ta.value = value;
			return ta;
		};
		const note = field("Note", data.note, "What is going on with it", 3);
		const doing = field("Doing (one per line)", data.doing.join("\n"), "What I am doing for it", 2);
		const fix = field("To fix (one per line)", data.fix.join("\n"), "What I should do next", 2);
		const links = field("Notes (one per line)", data.links.join("\n"), "[[Related note]]", 2);

		const save = form.createDiv({ cls: "ci-actions" }).createEl("button", { cls: "mod-cta", text: "Save" });
		save.addEventListener("click", () => {
			save.disabled = true;
			const status = chosen.id === state.id && !data.status ? undefined : chosen.id;
			const patch: RegionPatch = {
				note: note.value,
				doing: toList(doing.value),
				fix: toList(fix.value),
				links: toList(links.value),
				...(status === undefined ? {} : { status }),
			};
			void this.o.save(region.id, patch).then(() => {
				this.editing = false;
				this.draw();
			});
		});
	}

	/** Draws one button per state and returns the live choice. */
	private drawStatePicker(form: HTMLElement, current: State): { id: string } {
		const chosen = { id: current.id };
		const row = form.createDiv({ cls: "ci-states" });
		const buttons: { id: string; el: HTMLElement }[] = [];
		for (const s of this.o.profile.states) {
			const b = row.createEl("button", { cls: "ci-state" + (s.id === chosen.id ? " is-on" : "") });
			b.style.setProperty("--ci-c", s.color);
			b.createEl("i", { cls: "ci-dot" });
			b.appendText(s.label);
			b.addEventListener("click", () => {
				chosen.id = s.id;
				for (const x of buttons) x.el.toggleClass("is-on", x.id === chosen.id);
			});
			buttons.push({ id: s.id, el: b });
		}
		return chosen;
	}
}
