// A small Markdown renderer for the browser harness: headings, paragraphs, bullet lists, bold,
// italics, inline code and wikilinks. Enough to read the notes and the card; not Obsidian's renderer.
import type { HarnessApp } from "./browser-vault.ts";

const INLINE = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/;

function wikilink(app: HarnessApp, parent: HTMLElement, inner: string): void {
	const [target = "", alias] = inner.split("|");
	const name = target.split("#")[0]?.trim() ?? "";
	const dest = app.metadataCache.getFirstLinkpathDest(name);
	const a = parent.createEl("a", {
		cls: "internal-link" + (dest ? "" : " is-unresolved"),
		text: (alias ?? target).trim(),
		attr: { href: "#", "data-href": name },
	});
	a.addEventListener("click", (e) => {
		e.preventDefault();
		if (dest) {
			app.harness.open(dest.path);
			return;
		}
		void app.vault.create(`${name}.md`, "").then((f) => {
			app.harness.open(f.path);
		});
	});
}

function inline(app: HarnessApp, parent: HTMLElement, text: string): void {
	for (const part of text.split(INLINE)) {
		if (!part) continue;
		if (part.startsWith("[[")) wikilink(app, parent, part.slice(2, -2));
		else if (part.startsWith("**")) parent.createEl("strong", { text: part.slice(2, -2) });
		else if (part.startsWith("`")) parent.createEl("code", { text: part.slice(1, -1) });
		else if (part.startsWith("*") && part.length > 2) parent.createEl("em", { text: part.slice(1, -1) });
		else parent.appendText(part);
	}
}

type Line =
	| { kind: "blank" }
	| { kind: "heading"; level: number; text: string }
	| { kind: "bullet" | "text"; text: string };

function classify(line: string): Line {
	if (!line.trim()) return { kind: "blank" };
	const heading = /^(#{1,6})\s+(.*)$/.exec(line);
	if (heading) return { kind: "heading", level: heading[1]?.length ?? 1, text: heading[2] ?? "" };
	const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
	if (bullet) return { kind: "bullet", text: bullet[1] ?? "" };
	return { kind: "text", text: line };
}

/** Renders `text` into `el`, one block per paragraph, heading or list. */
export function renderMarkdown(app: HarnessApp, text: string, el: HTMLElement, _sourcePath: string): void {
	let list: HTMLElement | null = null;
	let para: HTMLElement | null = null;
	for (const line of text.split("\n").map(classify)) {
		if (line.kind === "blank") {
			list = para = null;
		} else if (line.kind === "heading") {
			list = para = null;
			inline(app, el.createEl(`h${String(line.level)}` as "h1"), line.text);
		} else if (line.kind === "bullet") {
			para = null;
			list ??= el.createEl("ul");
			inline(app, list.createEl("li"), line.text);
		} else {
			list = null;
			if (para) para.createEl("br");
			para ??= el.createEl("p");
			inline(app, para, line.text);
		}
	}
}
