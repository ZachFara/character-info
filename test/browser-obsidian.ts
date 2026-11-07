// A browser stand-in for the parts of Obsidian's API the plugin uses, so the whole plugin can run in
// Chrome (decision 0016). The browser harness bundles src/main.ts with `obsidian` pointed here.
// Class and CSS class names follow Obsidian's, so the plugin's styles apply as they would there.
import { installDomHelpers } from "./obsidian-stub.ts";
import { renderMarkdown } from "./browser-markdown.ts";
import type { Command, HarnessApp } from "./browser-vault.ts";

export { TFile, TFolder, normalizePath } from "./browser-vault.ts";

interface EventRef {
	off: () => void;
}

export class Component {
	private cleanups: (() => void)[] = [];
	private children: Component[] = [];

	load(): void {
		void this.onload();
	}

	onload(): void | Promise<void> {
		// subclasses override
	}

	onunload(): void {
		// subclasses override
	}

	addChild<T extends Component>(child: T): T {
		this.children.push(child);
		child.load();
		return child;
	}

	register(cb: () => void): void {
		this.cleanups.push(cb);
	}

	registerEvent(ref: EventRef): void {
		this.register(() => {
			ref.off();
		});
	}

	unload(): void {
		for (const c of this.children) c.unload();
		for (const cb of this.cleanups) cb();
		this.children = [];
		this.cleanups = [];
		this.onunload();
	}
}

export class MarkdownRenderChild extends Component {
	constructor(readonly containerEl: HTMLElement) {
		super();
	}
}

export const MarkdownRenderer = {
	render(app: HarnessApp, text: string, el: HTMLElement, sourcePath: string): Promise<void> {
		renderMarkdown(app, text, el, sourcePath);
		return Promise.resolve();
	},
};

export class Plugin extends Component {
	constructor(
		readonly app: HarnessApp,
		readonly manifest: unknown,
	) {
		super();
	}

	loadData(): Promise<unknown> {
		return Promise.resolve(this.app.harness.loadData());
	}

	saveData(data: unknown): Promise<void> {
		this.app.harness.saveData(data);
		return Promise.resolve();
	}

	addSettingTab(tab: PluginSettingTab): void {
		this.app.harness.registry.settingTabs.push(tab);
	}

	registerMarkdownCodeBlockProcessor(
		lang: string,
		fn: (source: string, el: HTMLElement, ctx: unknown) => void,
	): void {
		this.app.harness.registry.processors.set(lang, fn);
	}

	addCommand(cmd: Command): Command {
		this.app.harness.registry.commands.push(cmd);
		return cmd;
	}
}

export abstract class PluginSettingTab {
	readonly containerEl: HTMLElement = activeDocument.createElement("div");

	constructor(
		readonly app: HarnessApp,
		readonly plugin: Plugin,
	) {
		this.containerEl.className = "vertical-tab-content";
	}

	abstract display(): void;

	hide(): void {
		this.containerEl.empty();
	}
}

export class Notice {
	readonly noticeEl: HTMLElement;

	constructor(message: string, timeout = 4000) {
		let host = activeDocument.body.querySelector<HTMLElement>(".notice-container");
		host ??= activeDocument.body.createDiv({ cls: "notice-container" });
		this.noticeEl = host.createDiv({ cls: "notice", text: message });
		window.setTimeout(() => {
			this.hide();
		}, timeout);
	}

	hide(): void {
		this.noticeEl.remove();
	}
}

/** Obsidian adds these to every element; the test stub has the rest. */
export function installBrowserDom(): void {
	installDomHelpers(window);
	Object.assign(window.HTMLElement.prototype, {
		setText(this: HTMLElement, t: string): void {
			this.textContent = t;
		},
		addClass(this: HTMLElement, ...c: string[]): void {
			this.classList.add(...c);
		},
		setCssProps(this: HTMLElement, props: Record<string, string>): void {
			for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
		},
	});
}

export { Modal, Setting, AbstractInputSuggest } from "./browser-widgets.ts";
