import { MarkdownRenderer, type App, type Component } from "obsidian";
import { TEMPLATES, getMap, type MapPreset, type TemplateKey } from "./presets.ts";
import { armorMarkup } from "./armor-art.ts";
import {
	armorLooks,
	describeItem,
	isReviewDue,
	isUnknownStatus,
	itemsOnRegion,
	lastTouched,
	pickInitial,
	readInventory,
	readRegion,
	resolveState,
	tally,
	toList,
	today,
	daysBetween,
} from "./data.ts";
import {
	drawAddRegion,
	drawQuickAdd,
	drawStateButtons,
	drawViewToggle,
	type FigureView,
	type ListField,
} from "./card-actions.ts";
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
	/** Adds a region by writing it into the block text. Absent when this view's block cannot be edited. */
	addRegion?: (name: string) => void;
	/** Today as YYYY-MM-DD, for review badges. Tests pass a fixed day. */
	today?: () => string;
	/** A map loaded from an SVG file. Absent for the built-in maps. */
	map?: MapPreset;
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
interface FigureOptions {
	selected: string | null;
	/** Adds behaviour to each region. */
	decorate?: (g: SVGGElement, region: Region) => void;
	/** Armor drawings to lay over the figure. When given, every region is drawn neutral. */
	armor?: string[];
}

function figureSvg(profile: Profile, map: MapPreset, fm: Frontmatter, o: FigureOptions): SVGSVGElement {
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
		const neutral = o.armor !== undefined || state.id === profile.defaultState;
		const cls = "ci-region" + (neutral ? " is-default" : "") + (r.id === o.selected ? " is-sel" : "");
		const g = svgGroup(cls, [map.shapes[r.id] ?? ""]);
		g.dataset.region = r.id;
		if (!neutral) g.style.setProperty("--ci-c", state.color);
		o.decorate?.(g, r);
		svg.appendChild(g);
	}
	// The armor layer lets clicks through to the regions underneath.
	if (o.armor) svg.appendChild(svgGroup("ci-armor", o.armor));
	return svg;
}

/** A small, non-interactive figure for party tiles. Draws nothing when the profile has no map. */
export function drawMiniFigure(
	parent: HTMLElement,
	profile: Profile,
	fm: Frontmatter,
	map: MapPreset = getMap(profile.map),
): void {
	if (!profile.regions.some((r) => map.shapes[r.id] !== undefined)) return;
	const fig = parent.createDiv({ cls: "ci-mini" });
	fig.appendChild(figureSvg(profile, map, fm, { selected: null }));
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
	/** Whether the figure shows the body's states or the armor worn on it. */
	private view: FigureView = "body";
	private readonly map: MapPreset;

	constructor(private readonly o: ViewOptions) {
		this.map = o.map ?? getMap(o.profile.map);
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

	/** Whether a region is due a review today. */
	private due(regionId: string, fm: Frontmatter): boolean {
		return isReviewDue(this.o.profile, readRegion(fm, regionId), this.o.today?.() ?? today());
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
		const dueCount = this.o.profile.regions.filter((r) => this.due(r.id, fm)).length;
		if (dueCount) legend.createSpan({ cls: "ci-due-count", text: `${String(dueCount)} to review` });
	}

	/** Armor drawings for the inventory's worn pieces. Empty when the inventory is off or nothing has a drawing. */
	private armorOnShow(fm: Frontmatter): string[] {
		// Armor is drawn for the built-in figure, so a map from an SVG file has no armor view.
		if (!this.o.saveInventory || this.o.map) return [];
		return armorMarkup(armorLooks(readInventory(fm)));
	}

	private drawFigure(grid: HTMLElement, fm: Frontmatter): void {
		const fig = grid.createEl("figure", { cls: "ci-fig" });
		const armor = this.armorOnShow(fm);
		if (!armor.length) this.view = "body";
		else {
			drawViewToggle(fig, this.view, (view) => {
				this.view = view;
				this.draw();
			});
		}
		const caption = fig.createEl("figcaption", { text: HINT });
		const svg = figureSvg(this.o.profile, this.map, fm, {
			selected: this.selected,
			...(this.view === "armor" ? { armor } : {}),
			decorate: (g, r) => {
				this.decorateRegion(g, r, caption);
			},
		});
		fig.insertBefore(svg, caption);
	}

	private decorateRegion(g: SVGGElement, r: Region, caption: HTMLElement): void {
		g.addEventListener("click", () => {
			this.select(r.id);
		});
		g.addEventListener("mouseenter", () => {
			caption.textContent = r.name;
		});
		g.addEventListener("mouseleave", () => {
			caption.textContent = HINT;
		});
	}

	private drawRoster(side: HTMLElement, fm: Frontmatter): void {
		const roster = side.createDiv({ cls: "ci-roster" });
		for (const r of this.o.profile.regions) {
			const s = resolveState(this.o.profile, readRegion(fm, r.id).status);
			const cls =
				"ci-chip" + (r.id === this.selected ? " is-sel" : "") + (this.due(r.id, fm) ? " is-due" : "");
			const chip = roster.createEl("button", { cls });
			chip.style.setProperty("--ci-c", s.color);
			chip.createEl("i", { cls: "ci-dot" });
			chip.appendText(r.name);
			chip.addEventListener("click", () => {
				this.select(r.id);
			});
		}
		if (this.o.addRegion) drawAddRegion(roster, this.o.addRegion);
	}

	private markdown(target: HTMLElement, text: string): void {
		void MarkdownRenderer.render(this.o.app, text, target, this.o.sourcePath, this.o.component);
	}

	/** A titled list. With `onRemove`, each item gets a cross that reports its position. */
	private drawList(
		card: HTMLElement,
		title: string,
		items: string[],
		cls: string,
		onRemove?: (index: number) => void,
	): void {
		if (!items.length) return;
		const sec = card.createDiv({ cls: `ci-sec ${cls}` });
		sec.createDiv({ cls: "ci-sec-title", text: title });
		const ul = sec.createEl("ul");
		items.forEach((item, index) => {
			const li = ul.createEl("li");
			this.markdown(li.createSpan({ cls: "ci-li-text" }), item);
			if (!onRemove) return;
			const x = li.createEl("button", {
				cls: "ci-li-x",
				text: "×",
				attr: { "aria-label": `Remove ${item}` },
			});
			x.addEventListener("click", () => {
				onRemove(index);
			});
		});
	}

	/** Saves a list for a region, replacing the one it had. */
	private saveList(regionId: string, field: ListField, list: string[]): void {
		void this.o.save(regionId, { [field]: list });
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
		else {
			this.drawQuickStates(card, region, state);
			if (this.due(region.id, fm)) this.drawReviewDue(card, region.id, data);
			this.drawDetails(card, region.id, data, this.wornOn(region.id, fm));
		}
	}

	/** A note that the region has not been looked at for a while, with a button to say it has. */
	private drawReviewDue(card: HTMLElement, regionId: string, data: RegionData): void {
		const row = card.createDiv({ cls: "ci-review" });
		const last = lastTouched(data);
		const on = this.o.today?.() ?? today();
		const since = last === null ? "Never reviewed" : `Not reviewed in ${String(daysBetween(last, on))} days`;
		row.createSpan({ cls: "ci-review-text", text: `Review due. ${since}.` });
		row.createEl("button", { text: "Mark reviewed" }).addEventListener("click", () => {
			void this.o.save(regionId, { reviewed: true });
		});
	}

	/** One-click state change: the state buttons on the card itself, no Edit form needed. */
	private drawQuickStates(card: HTMLElement, region: Region, current: State): void {
		const holder = card.createDiv({ cls: "ci-quick" });
		drawStateButtons(holder, this.o.profile, current.id, (id) => {
			if (id === current.id) return;
			void this.o.save(region.id, { status: id });
		});
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

	private drawDetails(card: HTMLElement, regionId: string, data: RegionData, worn: string[]): void {
		if (data.note) this.markdown(card.createDiv({ cls: "ci-note" }), data.note);
		this.drawList(card, "Worn and held", worn, "worn");
		const lists: [ListField, string, string[]][] = [
			["doing", "Doing", data.doing],
			["fix", "To fix", data.fix],
			["links", "Notes", data.links],
		];
		for (const [field, title, items] of lists) {
			this.drawList(card, title, items, field, (index) => {
				this.saveList(
					regionId,
					field,
					items.filter((_, i) => i !== index),
				);
			});
		}
		this.drawHistory(card, data);
		if (!data.note && !data.doing.length && !data.fix.length && !data.links.length && !worn.length) {
			card.createDiv({ cls: "ci-empty", text: "Nothing logged yet." });
		}
		drawQuickAdd(card, this.o.app, (field, text) => {
			this.saveList(regionId, field, [...data[field], text]);
		});
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
		const chosen = { id: state.id };
		drawStateButtons(form, this.o.profile, state.id, (id) => {
			chosen.id = id;
		});
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
}
