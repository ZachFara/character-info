// The browser harness (decision 0015): the real plugin from src/main.ts, running in Chrome over an
// in-memory vault, with a note list, a reading and source view, the commands and the settings tab.
// Start it with `npm run harness`. `window.harness` exposes the same controls to scripts.
import type { App, PluginManifest } from "obsidian";
import CharacterInfoPlugin from "../src/main.ts";
import { Component, Modal, installBrowserDom } from "./browser-obsidian.ts";
import { renderMarkdown } from "./browser-markdown.ts";
import { SEED_NOTES } from "./browser-notes.ts";
import { installTheme } from "./browser-theme.ts";
import { createApp, splitFrontmatter, type HarnessApp } from "./browser-vault.ts";

Object.assign(window, { activeDocument: document, activeWindow: window });
installBrowserDom();
installTheme();

const STORE = "character-info-harness";
/** True inside the phone-width frame, which shows only the note. */
const framed = new URLSearchParams(location.search).has("frame");

interface Saved {
	files: Record<string, string>;
	data: unknown;
	open: string;
	theme: "light" | "dark";
	phone: boolean;
}

function loadSaved(): Saved {
	const fresh: Saved = { files: SEED_NOTES, data: null, open: "Welcome.md", theme: "light", phone: false };
	try {
		const raw = window.localStorage.getItem(STORE);
		return raw ? { ...fresh, ...(JSON.parse(raw) as Partial<Saved>) } : fresh;
	} catch {
		return fresh;
	}
}

const state = loadSaved();
let mode: "reading" | "source" = "reading";
let view = new Component();

function persist(): void {
	state.files = Object.fromEntries(app.vault.files);
	try {
		window.localStorage.setItem(STORE, JSON.stringify(state));
	} catch {
		// private windows and blocked storage: the session still works, it just does not persist
	}
}

const app: HarnessApp = createApp({
	registry: { processors: new Map(), commands: [], settingTabs: [] },
	loadData: () => structuredClone(state.data),
	saveData: (data) => {
		state.data = structuredClone(data);
		persist();
	},
	open: (path) => {
		openNote(path);
	},
});
for (const [path, text] of Object.entries(state.files)) app.vault.files.set(path, text);

const shell = document.body.createDiv({ cls: "hx-shell" });
const bar = shell.createDiv({ cls: "hx-bar" });
const main = shell.createDiv({ cls: "hx-main" });
const filesEl = main.createDiv({ cls: "hx-files" });
const leaf = main.createDiv({ cls: "hx-pane" }).createDiv({ cls: "hx-leaf markdown-rendered" });

interface Section {
	lang: string | null;
	lineStart: number;
	lineEnd: number;
	text: string;
}

/** Splits a note into prose and fenced blocks, keeping each block's line numbers. */
function sections(text: string): Section[] {
	const lines = text.split("\n");
	const out: Section[] = [];
	const { body } = splitFrontmatter(text);
	let i = text.slice(0, text.length - body.length).split("\n").length - 1;
	let prose: string[] = [];
	const flush = (): void => {
		if (prose.length) out.push({ lang: null, lineStart: i, lineEnd: i, text: prose.join("\n") });
		prose = [];
	};
	for (; i < lines.length; i++) {
		const open = /^```(\S*)/.exec(lines[i] ?? "");
		if (!open) {
			prose.push(lines[i] ?? "");
			continue;
		}
		flush();
		let end = i + 1;
		while (end < lines.length && !(lines[end] ?? "").startsWith("```")) end++;
		out.push({ lang: open[1] ?? "", lineStart: i, lineEnd: end, text: lines.slice(i + 1, end).join("\n") });
		i = end;
	}
	flush();
	return out;
}

function drawBlock(path: string, full: string, s: Section, parent: HTMLElement): void {
	const processor = s.lang ? app.harness.registry.processors.get(s.lang) : undefined;
	if (!processor) {
		parent.createEl("pre").createEl("code", { text: s.text });
		return;
	}
	const el = parent.createDiv({ cls: `block-language-${s.lang ?? ""}` });
	const ctx = {
		sourcePath: path,
		addChild: (c: Component) => view.addChild(c),
		getSectionInfo: () => ({ text: full, lineStart: s.lineStart, lineEnd: s.lineEnd }),
	};
	try {
		processor(s.text, el, ctx);
	} catch (err) {
		console.error("Harness: the block threw", err);
		el.createEl("pre", { text: `Block error: ${String(err)}` });
	}
}

function drawReading(path: string, text: string): void {
	const { fm } = splitFrontmatter(text);
	if (fm) {
		const props = leaf.createEl("details", { cls: "hx-props" });
		props.createEl("summary", { text: "Properties" });
		props.createEl("pre", { text: JSON.stringify(fm, null, 2) });
	}
	for (const s of sections(text)) {
		if (s.lang === null) renderMarkdown(app, s.text, leaf.createDiv(), path);
		else drawBlock(path, text, s, leaf);
	}
}

function drawSource(path: string, text: string): void {
	const area = leaf.createEl("textarea", { cls: "hx-source" });
	area.value = text;
	area.addEventListener("change", () => {
		app.vault.write(path, area.value);
	});
}

function render(): void {
	view.unload();
	view = new Component();
	leaf.empty();
	const path = state.open;
	const text = app.vault.text(path);
	leaf.createDiv({ cls: "hx-path", text: path });
	if (text === undefined) {
		leaf.createEl("p", { text: "This note does not exist." });
		return;
	}
	if (mode === "source") drawSource(path, text);
	else if (!path.endsWith(".md")) leaf.createEl("pre").createEl("code", { text });
	else drawReading(path, text);
}

function drawFiles(): void {
	filesEl.empty();
	const paths = [...app.vault.files.keys()].sort((a, b) => a.localeCompare(b));
	let folder = "";
	for (const p of [...paths.filter((x) => !x.includes("/")), ...paths.filter((x) => x.includes("/"))]) {
		const dir = p.split("/").slice(0, -1).join("/");
		if (dir !== folder) filesEl.createDiv({ cls: "hx-folder", text: dir });
		folder = dir;
		const b = filesEl.createEl("button", {
			text: p.split("/").pop()?.replace(/\.md$/, "") ?? p,
			cls: p === state.open ? "is-active" : "",
		});
		b.addEventListener("click", () => {
			openNote(p);
		});
	}
}

function openNote(path: string): void {
	state.open = path;
	persist();
	drawFiles();
	render();
}

let pending = false;
app.vault.onWrite = (file): void => {
	persist();
	if (pending) return;
	pending = true;
	queueMicrotask(() => {
		pending = false;
		drawFiles();
		if (file.path === state.open) render();
	});
};

/** The editor a command writes into: the cursor in Source mode, otherwise the end of the note. */
function editor(): { replaceSelection: (text: string) => void } {
	return {
		replaceSelection: (insert) => {
			const area = leaf.querySelector<HTMLTextAreaElement>("textarea");
			const text = app.vault.text(state.open) ?? "";
			if (area) {
				const at = area.selectionStart;
				app.vault.write(state.open, text.slice(0, at) + insert + text.slice(area.selectionEnd));
			} else {
				app.vault.write(state.open, `${text.replace(/\n*$/, "")}\n\n${insert}`);
			}
		},
	};
}

function runCommand(id: string): void {
	const cmd = app.harness.registry.commands.find((c) => c.id === id);
	if (!cmd) throw new Error(`No command ${id}`);
	if (cmd.editorCallback) void cmd.editorCallback(editor());
	else void cmd.callback?.();
}

function showCommands(): void {
	const m = new Modal(app).setTitle("Commands");
	const list = m.contentEl.createDiv({ cls: "hx-commands" });
	for (const c of app.harness.registry.commands) {
		list.createEl("button", { text: `Character Info: ${c.name}` }).addEventListener("click", () => {
			m.close();
			runCommand(c.id);
		});
	}
	m.open();
}

function showSettings(): void {
	const tab = app.harness.registry.settingTabs[0];
	if (!tab) return;
	const m = new Modal(app).setTitle("Character Info settings");
	m.onClose = (): void => {
		tab.hide();
	};
	m.contentEl.appendChild(tab.containerEl);
	tab.display();
	m.open();
}

function showData(): void {
	const m = new Modal(app).setTitle("data.json");
	m.contentEl.createEl("pre", { text: JSON.stringify(state.data, null, 2) });
	m.open();
}

function applyLook(): void {
	document.body.toggleClass("theme-dark", state.theme === "dark");
	document.body.toggleClass("theme-light", state.theme === "light");
	document.body.toggleClass("hx-framed", framed);
}

function reset(): void {
	try {
		window.localStorage.removeItem(STORE);
	} catch {
		// nothing stored
	}
	location.reload();
}

function drawBar(): void {
	bar.createSpan({ cls: "hx-title", text: "Character Info harness" });
	const button = (text: string, fn: () => void): HTMLButtonElement => {
		const b = bar.createEl("button", { text, cls: `hx-btn-${text.toLowerCase().replace(/\W+/g, "-")}` });
		b.addEventListener("click", fn);
		return b;
	};
	const source = button("Source", () => {
		mode = mode === "reading" ? "source" : "reading";
		source.textContent = mode === "reading" ? "Source" : "Reading";
		render();
	});
	button("Commands", showCommands);
	button("Settings", showSettings);
	button("data.json", showData);
	button("Theme", () => {
		state.theme = state.theme === "dark" ? "light" : "dark";
		persist();
		applyLook();
	});
	button("Phone width", () => {
		state.phone = !state.phone;
		persist();
		location.reload();
	});
	button("Reset vault", reset);
}

/** For scripts and browser automation: everything the buttons do, plus reading the vault. */
Object.assign(window, {
	harness: {
		open: openNote,
		run: runCommand,
		reset,
		read: (path: string) => app.vault.text(path),
		write: (path: string, text: string) => {
			app.vault.write(path, text);
		},
		files: () => [...app.vault.files.keys()],
		data: () => state.data,
		commands: () => app.harness.registry.commands.map((c) => c.id),
		setMode: (m: "reading" | "source") => {
			mode = m;
			render();
		},
	},
});

const plugin = new CharacterInfoPlugin(app as unknown as App, { id: "character-info" } as PluginManifest);
await plugin.onload();
applyLook();
drawBar();
drawFiles();
if (state.phone && !framed) {
	// A real 390px viewport, so the plugin's media queries apply. The frame shares this vault.
	main.empty();
	main.createEl("iframe", { cls: "hx-phone-frame", attr: { src: "?frame", title: "Phone width" } });
} else render();
