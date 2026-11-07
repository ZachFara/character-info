// Browser versions of Obsidian's Setting rows, modal and input suggester, for the browser harness.
import type { HarnessApp } from "./browser-vault.ts";

type Change<T> = (value: T) => unknown;

class ToggleComponent {
	readonly toggleEl: HTMLElement;
	private value = false;
	private change: Change<boolean> = () => undefined;

	constructor(parent: HTMLElement) {
		this.toggleEl = parent.createDiv({ cls: "checkbox-container", attr: { role: "switch", tabindex: "0" } });
		this.toggleEl.addEventListener("click", () => {
			this.setValue(!this.value);
			void this.change(this.value);
		});
	}

	setValue(v: boolean): this {
		this.value = v;
		this.toggleEl.toggleClass("is-enabled", v);
		this.toggleEl.setAttribute("aria-checked", String(v));
		return this;
	}

	onChange(cb: Change<boolean>): this {
		this.change = cb;
		return this;
	}
}

class DropdownComponent {
	readonly selectEl: HTMLSelectElement;

	constructor(parent: HTMLElement) {
		this.selectEl = parent.createEl("select", { cls: "dropdown" });
	}

	addOption(value: string, label: string): this {
		this.selectEl.createEl("option", { text: label, attr: { value } });
		return this;
	}

	setValue(v: string): this {
		this.selectEl.value = v;
		return this;
	}

	getValue(): string {
		return this.selectEl.value;
	}

	onChange(cb: Change<string>): this {
		this.selectEl.addEventListener("change", () => void cb(this.selectEl.value));
		return this;
	}
}

class ButtonComponent {
	readonly buttonEl: HTMLButtonElement;

	constructor(parent: HTMLElement) {
		this.buttonEl = parent.createEl("button");
	}

	setButtonText(t: string): this {
		this.buttonEl.textContent = t;
		return this;
	}

	setTooltip(t: string): this {
		this.buttonEl.setAttribute("aria-label", t);
		this.buttonEl.title = t;
		return this;
	}

	setWarning(): this {
		this.buttonEl.classList.add("mod-warning");
		return this;
	}

	setCta(): this {
		this.buttonEl.classList.add("mod-cta");
		return this;
	}

	onClick(cb: () => unknown): this {
		this.buttonEl.addEventListener("click", () => void cb());
		return this;
	}
}

class TextComponent {
	readonly inputEl: HTMLInputElement;

	constructor(parent: HTMLElement) {
		this.inputEl = parent.createEl("input", { attr: { type: "text" } });
	}

	setPlaceholder(t: string): this {
		this.inputEl.placeholder = t;
		return this;
	}

	setValue(v: string): this {
		this.inputEl.value = v;
		return this;
	}

	getValue(): string {
		return this.inputEl.value;
	}

	onChange(cb: Change<string>): this {
		this.inputEl.addEventListener("input", () => void cb(this.inputEl.value));
		return this;
	}
}

export class Setting {
	readonly settingEl: HTMLElement;
	readonly nameEl: HTMLElement;
	readonly descEl: HTMLElement;
	readonly controlEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = containerEl.createDiv({ cls: "setting-item" });
		const info = this.settingEl.createDiv({ cls: "setting-item-info" });
		this.nameEl = info.createDiv({ cls: "setting-item-name" });
		this.descEl = info.createDiv({ cls: "setting-item-description" });
		this.controlEl = this.settingEl.createDiv({ cls: "setting-item-control" });
	}

	setName(n: string): this {
		this.nameEl.textContent = n;
		return this;
	}

	setDesc(d: string): this {
		this.descEl.textContent = d;
		return this;
	}

	setHeading(): this {
		this.settingEl.classList.add("setting-item-heading");
		return this;
	}

	addToggle(cb: (c: ToggleComponent) => unknown): this {
		cb(new ToggleComponent(this.controlEl));
		return this;
	}

	addDropdown(cb: (c: DropdownComponent) => unknown): this {
		cb(new DropdownComponent(this.controlEl));
		return this;
	}

	addButton(cb: (c: ButtonComponent) => unknown): this {
		cb(new ButtonComponent(this.controlEl));
		return this;
	}

	addText(cb: (c: TextComponent) => unknown): this {
		cb(new TextComponent(this.controlEl));
		return this;
	}
}

export class Modal {
	readonly containerEl: HTMLElement;
	readonly modalEl: HTMLElement;
	readonly titleEl: HTMLElement;
	readonly contentEl: HTMLElement;
	private readonly onKey = (e: KeyboardEvent): void => {
		if (e.key === "Escape") this.close();
	};

	constructor(readonly app: HarnessApp) {
		this.containerEl = activeDocument.createElement("div");
		this.containerEl.className = "modal-container";
		this.containerEl.createDiv({ cls: "modal-bg" }).addEventListener("click", () => {
			this.close();
		});
		this.modalEl = this.containerEl.createDiv({ cls: "modal" });
		const close = this.modalEl.createEl("button", { cls: "modal-close-button", text: "×" });
		close.setAttribute("aria-label", "Close");
		close.addEventListener("click", () => {
			this.close();
		});
		this.titleEl = this.modalEl.createDiv({ cls: "modal-title" });
		this.contentEl = this.modalEl.createDiv({ cls: "modal-content" });
	}

	setTitle(t: string): this {
		this.titleEl.textContent = t;
		return this;
	}

	open(): void {
		activeDocument.body.appendChild(this.containerEl);
		activeDocument.addEventListener("keydown", this.onKey);
		this.onOpen();
	}

	close(): void {
		if (!this.containerEl.isConnected) return;
		activeDocument.removeEventListener("keydown", this.onKey);
		this.containerEl.remove();
		this.onClose();
	}

	onOpen(): void {
		// subclasses override
	}

	onClose(): void {
		// subclasses override
	}
}

/** A popup of suggestions under an input, driven by the arrow keys, Enter and the mouse. */
export abstract class AbstractInputSuggest<T> {
	private popup: HTMLElement | null = null;
	private items: T[] = [];
	private active = 0;

	constructor(
		protected readonly app: HarnessApp,
		private readonly inputEl: HTMLInputElement,
	) {
		inputEl.addEventListener("input", () => {
			this.refresh();
		});
		inputEl.addEventListener("keydown", (e) => {
			this.onKey(e);
		});
		inputEl.addEventListener("blur", () => {
			window.setTimeout(() => {
				this.close();
			}, 150);
		});
	}

	abstract getSuggestions(query: string): T[];
	abstract renderSuggestion(value: T, el: HTMLElement): void;

	selectSuggestion(_value: T): void {
		this.close();
	}

	close(): void {
		this.popup?.remove();
		this.popup = null;
	}

	private onKey(e: KeyboardEvent): void {
		if (!this.popup) return;
		const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
		const step = moves[e.key];
		if (step !== undefined) {
			this.active = (this.active + step + this.items.length) % this.items.length;
			this.draw();
		} else if (e.key === "Enter") {
			const v = this.items[this.active];
			if (v !== undefined) this.selectSuggestion(v);
		} else if (e.key === "Escape") {
			this.close();
		} else return;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	private refresh(): void {
		this.items = this.getSuggestions(this.inputEl.value);
		this.active = 0;
		if (!this.items.length) {
			this.close();
			return;
		}
		this.draw();
	}

	private draw(): void {
		this.popup ??= activeDocument.body.createDiv({ cls: "suggestion-container" });
		this.popup.empty();
		const box = this.inputEl.getBoundingClientRect();
		this.popup.setCssProps({ left: `${String(box.left)}px`, top: `${String(box.bottom + 2)}px` });
		this.items.forEach((v, i) => {
			const row = this.popup?.createDiv({
				cls: "suggestion-item" + (i === this.active ? " is-selected" : ""),
			});
			if (!row) return;
			this.renderSuggestion(v, row);
			row.addEventListener("mousedown", (e) => {
				e.preventDefault();
				this.selectSuggestion(v);
			});
		});
	}
}
