import { ITEM_KINDS } from "./data.ts";
import type { Item, ItemKind, Region } from "./types.ts";

export interface InventoryOptions {
	items: Item[];
	regions: Region[];
	save: (items: Item[]) => Promise<void>;
	/** Renders text as Obsidian markdown so a note link in a name is a real link. */
	markdown: (target: HTMLElement, text: string) => void;
}

const GROUP_TITLES: Record<ItemKind, string> = { weapon: "Weapons", armor: "Armor", gear: "Gear" };
const KIND_LABELS: Record<ItemKind, string> = { weapon: "Weapon", armor: "Armor", gear: "Gear" };
const CARRIED = "";
/** Most things people add are gear, so the add row starts there. */
const DEFAULT_KIND: ItemKind = "gear";

/** The inventory panel: items grouped by kind, with quantity buttons, remove, and a row to add one. */
export function drawInventory(parent: HTMLElement, o: InventoryOptions): void {
	const root = parent.createDiv({ cls: "ci-inventory" });
	const head = root.createDiv({ cls: "ci-inv-head" });
	head.createEl("h4", { cls: "ci-inv-title", text: "Inventory" });
	head.createSpan({ cls: "ci-inv-count", text: `${String(o.items.length)} items` });
	if (!o.items.length) root.createDiv({ cls: "ci-empty", text: "Nothing carried yet." });
	for (const kind of ITEM_KINDS) drawGroup(root, o, kind);
	drawAddRow(root, o);
}

function drawGroup(root: HTMLElement, o: InventoryOptions, kind: ItemKind): void {
	const indexes = o.items.map((_, i) => i).filter((i) => o.items[i]?.kind === kind);
	if (!indexes.length) return;
	const group = root.createDiv({ cls: `ci-inv-group ${kind}` });
	group.createDiv({ cls: "ci-sec-title", text: GROUP_TITLES[kind] });
	for (const i of indexes) {
		const item = o.items[i];
		if (item) drawItem(group, o, item, i);
	}
}

function replaceAt(items: Item[], index: number, item: Item | null): Item[] {
	const next = [...items];
	if (item) next.splice(index, 1, item);
	else next.splice(index, 1);
	return next;
}

function smallButton(
	parent: HTMLElement,
	text: string,
	label: string,
	onClick: () => void,
): HTMLButtonElement {
	const b = parent.createEl("button", { cls: "ci-inv-btn", text, attr: { "aria-label": label } });
	b.addEventListener("click", onClick);
	return b;
}

function drawItem(group: HTMLElement, o: InventoryOptions, item: Item, index: number): void {
	const row = group.createDiv({ cls: "ci-item" });
	const qty = row.createDiv({ cls: "ci-item-qty" });
	const minus = smallButton(qty, "−", `One fewer ${item.name}`, () => {
		void o.save(replaceAt(o.items, index, { ...item, qty: item.qty - 1 }));
	});
	minus.disabled = item.qty <= 1;
	qty.createSpan({ cls: "ci-item-n", text: String(item.qty) });
	smallButton(qty, "+", `One more ${item.name}`, () => {
		void o.save(replaceAt(o.items, index, { ...item, qty: item.qty + 1 }));
	});

	const body = row.createDiv({ cls: "ci-item-body" });
	o.markdown(body.createDiv({ cls: "ci-item-name" }), item.name);
	if (item.note) body.createDiv({ cls: "ci-item-note", text: item.note });
	const region = o.regions.find((r) => r.id === item.region);
	if (region) row.createSpan({ cls: "ci-item-region", text: region.name });
	smallButton(row, "×", `Remove ${item.name}`, () => {
		void o.save(replaceAt(o.items, index, null));
	});
}

function drawAddRow(root: HTMLElement, o: InventoryOptions): void {
	const row = root.createDiv({ cls: "ci-item-add" });
	const name = row.createEl("input", { attr: { type: "text", placeholder: "Add an item" } });
	const note = row.createEl("input", { attr: { type: "text", placeholder: "Note" } });
	const kind = row.createEl("select", { attr: { "aria-label": "Kind" } });
	for (const k of ITEM_KINDS) kind.createEl("option", { text: KIND_LABELS[k], attr: { value: k } });
	kind.value = DEFAULT_KIND;
	const region = row.createEl("select", { attr: { "aria-label": "Worn or held on" } });
	region.createEl("option", { text: "Carried", attr: { value: CARRIED } });
	for (const r of o.regions) region.createEl("option", { text: r.name, attr: { value: r.id } });

	const add = (): void => {
		const text = name.value.trim();
		const chosen = ITEM_KINDS.find((k) => k === kind.value);
		if (!text || !chosen) return;
		const item: Item = {
			name: text,
			kind: chosen,
			qty: 1,
			note: note.value.trim(),
			region: region.value || null,
		};
		void o.save([...o.items, item]);
	};
	name.addEventListener("keydown", (e) => {
		if (e.key === "Enter") add();
	});
	row.createEl("button", { cls: "mod-cta", text: "Add" }).addEventListener("click", add);
}
