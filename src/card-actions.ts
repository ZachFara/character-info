import { AbstractInputSuggest, type App, type TFile } from "obsidian";
import type { Profile } from "./types.ts";

/**
 * One button per state, with the current one marked. Picking a button marks it and reports the
 * choice. The edit form and the one-click row on the card both use this.
 */
export function drawStateButtons(
	parent: HTMLElement,
	profile: Profile,
	currentId: string,
	onPick: (id: string) => void,
): void {
	const row = parent.createDiv({ cls: "ci-states" });
	const buttons: { id: string; el: HTMLElement }[] = [];
	for (const s of profile.states) {
		const b = row.createEl("button", { cls: "ci-state" + (s.id === currentId ? " is-on" : "") });
		b.style.setProperty("--ci-c", s.color);
		b.createEl("i", { cls: "ci-dot" });
		b.appendText(s.label);
		b.addEventListener("click", () => {
			for (const x of buttons) x.el.toggleClass("is-on", x.id === s.id);
			onPick(s.id);
		});
		buttons.push({ id: s.id, el: b });
	}
}

/** The lists a quick add can write to. */
export type ListField = "doing" | "fix" | "links";

const FIELD_LABELS: Record<ListField, string> = { doing: "Doing", fix: "To fix", links: "Link a note" };
const FIELDS: ListField[] = ["doing", "fix", "links"];

/** Suggests note names as you type, and fills the box with a wikilink when one is picked. */
class NoteSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		private readonly input: HTMLInputElement,
		private readonly active: () => boolean,
	) {
		super(app, input);
	}

	getSuggestions(query: string): TFile[] {
		if (!this.active()) return [];
		const q = query.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((f) => f.basename.toLowerCase().includes(q))
			.slice(0, 20);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.basename);
	}

	override selectSuggestion(file: TFile): void {
		this.input.value = `[[${file.basename}]]`;
		this.close();
	}
}

/** What a quick add writes: a list name and the text to add. Links are wrapped in [[ ]]. */
export function quickAddValue(field: ListField, text: string): string {
	const t = text.trim();
	return field === "links" && t && !t.startsWith("[[") ? `[[${t}]]` : t;
}

/** One row to add an item to Doing, To fix or the linked notes, with note suggestions for links. */
export function drawQuickAdd(
	parent: HTMLElement,
	app: App,
	onAdd: (field: ListField, text: string) => void,
): void {
	const row = parent.createDiv({ cls: "ci-quick-add" });
	const kind = row.createEl("select", { attr: { "aria-label": "Add to" } });
	for (const f of FIELDS) kind.createEl("option", { text: FIELD_LABELS[f], attr: { value: f } });
	const input = row.createEl("input", { attr: { type: "text", placeholder: "Add and press Enter" } });
	const field = (): ListField => FIELDS.find((f) => f === kind.value) ?? "doing";
	new NoteSuggest(app, input, () => field() === "links");
	const add = (): void => {
		const text = quickAddValue(field(), input.value);
		if (!text) return;
		onAdd(field(), text);
		input.value = "";
	};
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") add();
	});
	row.createEl("button", { text: "Add" }).addEventListener("click", add);
}
