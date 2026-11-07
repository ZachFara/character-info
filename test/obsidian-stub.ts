// Minimal stand-in for the parts of Obsidian's API that the renderer touches.
/** Type-ahead on an input. The tests never open the popup, so this does nothing. */
export class AbstractInputSuggest<T> {
	protected app: unknown;
	/** Unused. Keeps the type parameter in use. */
	protected suggestions?: T[];

	constructor(app: unknown, _input: HTMLInputElement) {
		this.app = app;
	}

	close(): void {
		// nothing to close in tests
	}
}

export const MarkdownRenderer = {
	render(_app: unknown, text: string, target: HTMLElement): Promise<void> {
		target.textContent = text; // the real one renders markdown; the text is enough to assert on
		return Promise.resolve();
	},
};

interface CreateOptions {
	cls?: string;
	text?: string;
	attr?: Record<string, string>;
}

/** Obsidian adds these helpers to every HTMLElement. */
export function installDomHelpers(win: Window & typeof globalThis): void {
	Object.assign(win.HTMLElement.prototype, {
		empty(this: HTMLElement): void {
			this.replaceChildren();
		},
		createEl(this: HTMLElement, tag: string, o: CreateOptions = {}): HTMLElement {
			const el = this.ownerDocument.createElement(tag);
			if (o.cls) el.className = o.cls;
			if (o.text) el.textContent = o.text;
			for (const [k, v] of Object.entries(o.attr ?? {})) el.setAttribute(k, v);
			this.appendChild(el);
			return el;
		},
		createDiv(this: HTMLElement, o?: CreateOptions): HTMLElement {
			return (this as unknown as { createEl: (t: string, o?: CreateOptions) => HTMLElement }).createEl(
				"div",
				o,
			);
		},
		createSpan(this: HTMLElement, o?: CreateOptions): HTMLElement {
			return (this as unknown as { createEl: (t: string, o?: CreateOptions) => HTMLElement }).createEl(
				"span",
				o,
			);
		},
		appendText(this: HTMLElement, t: string): void {
			this.appendChild(this.ownerDocument.createTextNode(t));
		},
		toggleClass(this: HTMLElement, c: string, on: boolean): void {
			this.classList.toggle(c, on);
		},
	});
}
