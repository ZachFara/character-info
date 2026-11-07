// An in-memory vault for the browser harness: notes, a frontmatter cache with change events, the
// frontmatter writer and a workspace that opens notes. Notes and data.json persist in localStorage.
import { parse, stringify } from "yaml";

export function normalizePath(p: string): string {
	return p
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");
}

export class TAbstractFile {
	constructor(readonly path: string) {}

	get name(): string {
		return this.path.split("/").pop() ?? this.path;
	}
}

export class TFile extends TAbstractFile {
	get extension(): string {
		return this.name.includes(".") ? (this.name.split(".").pop() ?? "") : "";
	}

	get basename(): string {
		return this.name.replace(/\.md$/, "");
	}
}

export class TFolder extends TAbstractFile {}

type Frontmatter = Record<string, unknown>;
type Listener = (file: TFile) => void;

const FM = /^---\n([\s\S]*?)\n---\n?/;

/** Splits a note into its frontmatter object and the text after it. Bad YAML reads as none. */
export function splitFrontmatter(text: string): { fm: Frontmatter | undefined; body: string } {
	const m = FM.exec(text);
	if (!m) return { fm: undefined, body: text };
	try {
		const fm: unknown = parse(m[1] ?? "");
		const ok = typeof fm === "object" && fm !== null && !Array.isArray(fm);
		return { fm: ok ? (fm as Frontmatter) : {}, body: text.slice(m[0].length) };
	} catch {
		return { fm: undefined, body: text.slice(m[0].length) };
	}
}

export class MetadataCache {
	private readonly listeners = new Set<Listener>();

	constructor(private readonly vault: Vault) {}

	getFileCache(file: TFile): { frontmatter?: Frontmatter } | null {
		const text = this.vault.text(file.path);
		if (text === undefined) return null;
		const { fm } = splitFrontmatter(text);
		return fm ? { frontmatter: fm } : {};
	}

	/** Finds a file the way a link would: by path, by name with its extension, or by note name. */
	getFirstLinkpathDest(link: string, _sourcePath?: string): TFile | null {
		const want = normalizePath(link).toLowerCase();
		const files = [...this.vault.files.keys()].map((p) => new TFile(p));
		const match = (f: TFile): boolean =>
			[f.path, f.name, f.basename, f.path.replace(/\.md$/, "")].some((n) => n.toLowerCase() === want);
		return files.find(match) ?? null;
	}

	on(_name: "changed", cb: Listener): { off: () => void } {
		this.listeners.add(cb);
		return {
			off: () => {
				this.listeners.delete(cb);
			},
		};
	}

	trigger(file: TFile): void {
		for (const cb of [...this.listeners]) cb(file);
	}
}

export class Vault {
	readonly files = new Map<string, string>();
	readonly folders = new Set<string>();
	/** Called after any write, once the cache has fired. The shell redraws from here. */
	onWrite: (file: TFile) => void = () => undefined;
	metadataCache: MetadataCache | null = null;
	private readonly modifyListeners = new Set<Listener>();

	text(path: string): string | undefined {
		return this.files.get(normalizePath(path));
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		const p = normalizePath(path);
		if (this.files.has(p)) return new TFile(p);
		return this.folders.has(p) ? new TFolder(p) : null;
	}

	getMarkdownFiles(): TFile[] {
		return [...this.files.keys()].filter((p) => p.endsWith(".md")).map((p) => new TFile(p));
	}

	read(file: TFile): Promise<string> {
		return Promise.resolve(this.text(file.path) ?? "");
	}

	cachedRead(file: TFile): Promise<string> {
		return this.read(file);
	}

	on(_name: "modify", cb: Listener): { off: () => void } {
		this.modifyListeners.add(cb);
		return {
			off: () => {
				this.modifyListeners.delete(cb);
			},
		};
	}

	createFolder(path: string): Promise<void> {
		this.folders.add(normalizePath(path));
		return Promise.resolve();
	}

	create(path: string, text: string): Promise<TFile> {
		const p = normalizePath(path);
		if (this.files.has(p)) return Promise.reject(new Error(`File already exists: ${p}`));
		this.write(p, text);
		return Promise.resolve(new TFile(p));
	}

	modify(file: TFile, text: string): Promise<void> {
		this.write(file.path, text);
		return Promise.resolve();
	}

	process(file: TFile, fn: (text: string) => string): Promise<string> {
		const next = fn(this.text(file.path) ?? "");
		this.write(file.path, next);
		return Promise.resolve(next);
	}

	write(path: string, text: string): void {
		const p = normalizePath(path);
		this.files.set(p, text);
		const folder = p.split("/").slice(0, -1).join("/");
		if (folder) this.folders.add(folder);
		const file = new TFile(p);
		for (const cb of [...this.modifyListeners]) cb(file);
		this.metadataCache?.trigger(file);
		this.onWrite(file);
	}
}

export class FileManager {
	constructor(private readonly vault: Vault) {}

	/** Like Obsidian's: hands the parsed frontmatter to `fn` and writes back what it leaves. */
	processFrontMatter(file: TFile, fn: (fm: Frontmatter) => void): Promise<void> {
		const text = this.vault.text(file.path) ?? "";
		const { fm, body } = splitFrontmatter(text);
		const data = fm ?? {};
		fn(data);
		const yaml = Object.keys(data).length ? stringify(data) : "";
		this.vault.write(file.path, yaml ? `---\n${yaml}---\n${body}` : body);
		return Promise.resolve();
	}
}

export interface Command {
	id: string;
	name: string;
	callback?: () => unknown;
	editorCallback?: (editor: { replaceSelection: (text: string) => void }) => unknown;
}

/** The pieces a plugin registers. The harness shell reads them to draw notes, settings and commands. */
export interface Registry {
	processors: Map<string, (source: string, el: HTMLElement, ctx: unknown) => void>;
	commands: Command[];
	settingTabs: { containerEl: HTMLElement; display: () => void; hide: () => void }[];
}

/** The harness's own hooks, reached by the fake Plugin class. */
export interface HarnessHooks {
	registry: Registry;
	loadData: () => unknown;
	saveData: (data: unknown) => void;
	open: (path: string) => void;
}

export interface HarnessApp {
	vault: Vault;
	metadataCache: MetadataCache;
	fileManager: FileManager;
	workspace: { getLeaf: (newLeaf?: boolean) => { openFile: (file: TFile) => Promise<void> } };
	harness: HarnessHooks;
}

export function createApp(hooks: HarnessHooks): HarnessApp {
	const vault = new Vault();
	const metadataCache = new MetadataCache(vault);
	vault.metadataCache = metadataCache;
	return {
		vault,
		metadataCache,
		fileManager: new FileManager(vault),
		workspace: {
			getLeaf: () => ({
				openFile: (file) => {
					hooks.open(file.path);
					return Promise.resolve();
				},
			}),
		},
		harness: hooks,
	};
}
