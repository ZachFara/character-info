// Minimal stand-in for the parts of Obsidian's API that render.js touches.
export const MarkdownRenderer = {
	render(_app, text, target) {
		target.textContent = text; // the real one renders markdown; the text is enough to assert on
		return Promise.resolve();
	},
};

/** Obsidian adds these helpers to every HTMLElement. */
export function installDomHelpers(window) {
	const P = window.HTMLElement.prototype;
	P.empty = function () { this.replaceChildren(); };
	P.createEl = function (tag, o = {}) {
		const el = this.ownerDocument.createElement(tag);
		if (o.cls) el.className = o.cls;
		if (o.text) el.textContent = o.text;
		if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, v);
		this.appendChild(el);
		return el;
	};
	P.createDiv = function (o) { return this.createEl("div", o); };
	P.createSpan = function (o) { return this.createEl("span", o); };
	P.appendText = function (t) { this.appendChild(this.ownerDocument.createTextNode(t)); };
	P.toggleClass = function (c, on) { this.classList.toggle(c, on); };
}
