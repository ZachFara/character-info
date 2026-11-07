import {
	MarkdownRenderChild,
	Notice,
	Plugin,
	TFile,
	normalizePath,
	type MarkdownPostProcessorContext,
} from "obsidian";
import { applyEdit, applyInventory, normalizeSettings, parseBlock } from "./data.ts";
import {
	addRegionLine,
	isDefinition,
	newProfileBlock,
	parsePartyBlock,
	resolveDefinition,
	type BlockMode,
} from "./profile-text.ts";
import { PartyView, type PartyMember } from "./party.ts";
import { NewProfileModal } from "./new-profile.ts";
import { makeProfile, type TemplateKey } from "./presets.ts";
import { CharacterInfoView, drawCreatePrompt, drawNotice } from "./render.ts";
import { CharacterInfoSettingTab } from "./settings.ts";
import type { Frontmatter, Item, PluginSettings, Profile, RegionPatch } from "./types.ts";

/** What a mounted block exposes so the plugin can refresh it when data changes. */
interface Mounted {
	dataPath: string | null;
	redraw: () => void;
}

export default class CharacterInfoPlugin extends Plugin {
	/** Edited in place, never reassigned, because the settings tab holds a reference. */
	settings: PluginSettings = { profiles: [], defaultProfile: "", features: { inventory: false } };
	/** Party blocks listen here so a profile added or forgotten anywhere updates them. */
	private readonly registryListeners = new Set<() => void>();

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(
			new CharacterInfoSettingTab(this.app, this, {
				settings: this.settings,
				save: async () => {
					await this.saveSettings();
					this.notifyRegistry();
				},
				openDataNote: async (profile) => {
					const file = await this.ensureDataFile(profile);
					await this.app.workspace.getLeaf(false).openFile(file);
				},
			}),
		);
		this.registerMarkdownCodeBlockProcessor("character-info", (source, el, ctx) => {
			this.mountBlock(source, el, ctx);
		});
		this.registerMarkdownCodeBlockProcessor("character-party", (source, el, ctx) => {
			this.mountParty(source, el, ctx);
		});
		this.addCommands();
	}

	private notifyRegistry(): void {
		for (const listener of this.registryListeners) listener();
	}

	/** Draws a party block. It rebuilds when the registry changes and redraws when a member's data does. */
	private mountParty(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const child = new MarkdownRenderChild(el);
		ctx.addChild(child);
		const block = parsePartyBlock(source);
		let members: PartyMember[] = [];
		let view: PartyView | null = null;
		const build = (): void => {
			members = this.partyMembers(block.names, block.all);
			view = new PartyView({
				app: this.app,
				el,
				title: block.title,
				members,
				sourcePath: ctx.sourcePath,
				component: child,
				getFrontmatter: (profile) => this.frontmatterFor(profile),
				save: (profile, regionId, patch) => this.saveRegion(profile, regionId, patch),
				saveInventory: (profile) => this.inventorySaver(profile),
			});
			view.draw();
		};
		build();
		this.registryListeners.add(build);
		child.register(() => this.registryListeners.delete(build));
		child.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				const shown = members.some((m) => "profile" in m && normalizePath(m.profile.dataPath) === file.path);
				if (shown) view?.refresh();
			}),
		);
	}

	private partyMembers(names: string[], all: boolean): PartyMember[] {
		if (all) return this.settings.profiles.map((profile) => ({ profile }));
		return names.map((name) => {
			const profile = this.findProfile(name, true);
			return profile ? { profile } : { missing: name };
		});
	}

	/** Draws a block, and again whenever the profile note it shows changes or a profile is created. */
	private mountBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const child = new MarkdownRenderChild(el);
		ctx.addChild(child);
		let mounted: Mounted = { dataPath: null, redraw: () => undefined };
		const mount = (): void => {
			mounted = this.drawBlock(source, el, ctx, child, mount);
		};
		mount();
		this.registryListeners.add(mount);
		child.register(() => this.registryListeners.delete(mount));
		child.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				if (mounted.dataPath !== null && file.path === normalizePath(mounted.dataPath)) mounted.redraw();
			}),
		);
	}

	private drawBlock(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		child: MarkdownRenderChild,
		remount: () => void,
	): Mounted {
		const none: Mounted = { dataPath: null, redraw: () => undefined };
		const block = parseBlock(source);
		const name = block.profile ?? this.profileFromNote(ctx.sourcePath) ?? undefined;
		if (name !== undefined) block.profile = name;
		const profile = this.profileForBlock(block, el, remount);
		if (!profile) return none;
		const view = new CharacterInfoView({
			app: this.app,
			el,
			profile,
			sourcePath: ctx.sourcePath,
			component: child,
			getFrontmatter: () => this.frontmatterFor(profile),
			save: (regionId, patch) => this.saveRegion(profile, regionId, patch),
			saveInventory: this.inventorySaver(profile),
			addRegion: this.regionAdder(block, el, ctx, profile),
		});
		view.draw();
		return {
			dataPath: profile.dataPath,
			redraw: () => {
				view.draw();
			},
		};
	}

	/** The profile a block means, or null after drawing why there is none. */
	private profileForBlock(
		block: Record<string, string>,
		el: HTMLElement,
		remount: () => void,
	): Profile | null {
		const name = block.profile;
		if (name === undefined || name.trim() === "") {
			const fallback = this.findProfile(null);
			if (fallback) return fallback;
			drawNotice(el, "Add a line like “profile: Thorn” to this block, or run the command “New profile”.");
			return null;
		}
		const existing = this.findProfile(name, true);
		if (isDefinition(block)) {
			const result = resolveDefinition(block, existing ?? undefined);
			if (!result.ok) {
				drawNotice(el, result.error);
				return null;
			}
			this.registerProfile(result.profile);
			return result.profile;
		}
		if (existing) return existing;
		drawCreatePrompt(el, name, (template) => {
			this.createProfile(name, template);
			remount();
		});
		return null;
	}

	private addCommands(): void {
		this.addCommand({
			id: "new-party",
			name: "New party",
			editorCallback: (editor) => {
				editor.replaceSelection("```character-party\ntitle: Party\nall\n```\n");
			},
		});
		const modes: [BlockMode, string, string][] = [
			["simple", "new-profile", "New profile"],
			["full", "new-profile-full", "New profile, full template"],
		];
		for (const [mode, id, name] of modes) {
			this.addCommand({
				id,
				name,
				editorCallback: (editor) => {
					new NewProfileModal(this.app, mode, (profileName, template) => {
						editor.replaceSelection(newProfileBlock(profileName, template, mode));
					}).open();
				},
			});
		}
		this.addCommand({
			id: "open-data-note",
			name: "Open the default profile data note",
			callback: async () => {
				const profile = this.findProfile(null);
				if (!profile) {
					new Notice("Character Info: write a block with a profile line first.");
					return;
				}
				const file = await this.ensureDataFile(profile);
				await this.app.workspace.getLeaf(false).openFile(file);
			},
		});
	}

	private profileFromNote(path: string): string | null {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return null;
		const value: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.["character-info-profile"];
		return typeof value === "string" ? value : null;
	}

	/** Looks a profile up by name. With `exact`, a missing name stays missing instead of using the default. */
	private findProfile(name: string | null | undefined, exact = false): Profile | null {
		const { profiles, defaultProfile } = this.settings;
		const wanted = name?.trim().toLowerCase();
		const named = wanted ? profiles.find((p) => p.name.toLowerCase() === wanted) : undefined;
		if (named || exact) return named ?? null;
		return profiles.find((p) => p.id === defaultProfile) ?? profiles[0] ?? null;
	}

	/** Adds or updates a profile in the registry, saving only when something changed. */
	private registerProfile(profile: Profile): void {
		const list = this.settings.profiles;
		const at = list.findIndex((p) => p.id === profile.id);
		if (at >= 0 && JSON.stringify(list[at]) === JSON.stringify(profile)) return;
		if (at >= 0) list[at] = profile;
		else list.push(profile);
		if (!this.settings.defaultProfile) this.settings.defaultProfile = profile.id;
		void this.saveSettings().then(() => {
			this.notifyRegistry();
		});
	}

	private createProfile(name: string, template: TemplateKey): void {
		this.registerProfile(makeProfile(template, name, this.settings.profiles));
	}

	private frontmatterFor(profile: Profile): Frontmatter {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(profile.dataPath));
		if (!(file instanceof TFile)) return {};
		const fm: Frontmatter | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
		return fm ?? {};
	}

	private async ensureDataFile(profile: Profile): Promise<TFile> {
		const path = normalizePath(profile.dataPath);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) return existing;
		const folder = path.split("/").slice(0, -1).join("/");
		if (folder && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
		return this.app.vault.create(path, `---\ncharacter-info-profile: ${profile.name}\nregions: {}\n---\n`);
	}

	/**
	 * Adds a region by editing the block's own text, or undefined when the block cannot be found in
	 * its note (embedded views, for instance). A block that only referred to a profile becomes a
	 * definition, so it keeps the profile's template.
	 */
	private regionAdder(
		block: Record<string, string>,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		profile: Profile,
	): ((name: string) => void) | undefined {
		const info = ctx.getSectionInfo(el);
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!info || !(file instanceof TFile)) return undefined;
		return (name) => {
			void this.app.vault
				.process(file, (text) => {
					const lines = text.split("\n");
					if (!lines[info.lineStart]?.trimStart().startsWith("```character-info")) return text;
					const inner = lines.slice(info.lineStart + 1, info.lineEnd).join("\n");
					const edited = addRegionLine(inner, name, isDefinition(block) ? null : profile.template);
					lines.splice(info.lineStart + 1, info.lineEnd - info.lineStart - 1, ...edited.split("\n"));
					return lines.join("\n");
				})
				.catch((err: unknown) => {
					console.error("Character Info: could not edit the block", err);
					new Notice("Character Info: could not add the region. See the console for details.");
				});
		};
	}

	/** The inventory writer for a profile, or null when the inventory feature is switched off. */
	private inventorySaver(profile: Profile): ((items: Item[]) => Promise<void>) | null {
		if (!this.settings.features.inventory) return null;
		return async (items) => {
			try {
				const file = await this.ensureDataFile(profile);
				await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
					applyInventory(fm, items);
				});
			} catch (err) {
				console.error("Character Info: could not save the inventory", err);
				new Notice("Character Info: could not save the inventory. See the console for details.");
			}
		};
	}

	private async saveRegion(profile: Profile, regionId: string, patch: RegionPatch): Promise<void> {
		try {
			const file = await this.ensureDataFile(profile);
			await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
				applyEdit(fm, profile, regionId, patch);
			});
		} catch (err) {
			console.error("Character Info: could not save", err);
			new Notice("Character Info: could not save. See the console for details.");
		}
	}

	private async loadSettings(): Promise<void> {
		const loaded: unknown = await this.loadData();
		Object.assign(this.settings, normalizeSettings(loaded));
	}

	private async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
