import { MarkdownRenderChild, Notice, Plugin, TFile, normalizePath } from "obsidian";
import { applyEdit, normalizeSettings, parseBlock } from "./data.ts";
import { makeProfile } from "./presets.ts";
import { CharacterInfoView } from "./render.ts";
import { CharacterInfoSettingTab } from "./settings.ts";
import type { Frontmatter, PluginSettings, Profile, RegionPatch } from "./types.ts";

export default class CharacterInfoPlugin extends Plugin {
	/** Edited in place, never reassigned, because the settings tab holds a reference. */
	settings: PluginSettings = { profiles: [], defaultProfile: "" };

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(
			new CharacterInfoSettingTab(this.app, this, {
				settings: this.settings,
				save: () => this.saveSettings(),
				createDataNote: async (profile) => {
					await this.ensureDataFile(profile);
				},
			}),
		);
		this.registerMarkdownCodeBlockProcessor("character-info", (source, el, ctx) => {
			const opts = parseBlock(source);
			const profile = this.findProfile(opts.profile ?? this.profileFromNote(ctx.sourcePath));
			if (!profile) {
				el.createDiv({
					cls: "ci-warn",
					text: "Character Info: no profile found. Add one in the plugin settings.",
				});
				return;
			}
			const child = new MarkdownRenderChild(el);
			ctx.addChild(child);
			const view = new CharacterInfoView({
				app: this.app,
				el,
				profile,
				sourcePath: ctx.sourcePath,
				component: child,
				getFrontmatter: () => this.frontmatterFor(profile),
				save: (regionId, patch) => this.saveRegion(profile, regionId, patch),
			});
			view.draw();
			child.registerEvent(
				this.app.metadataCache.on("changed", (file) => {
					if (file.path === normalizePath(profile.dataPath)) view.draw();
				}),
			);
		});
		this.addCommands();
	}

	private addCommands(): void {
		this.addCommand({
			id: "insert-block",
			name: "Insert block",
			editorCallback: (editor) => {
				const name = this.findProfile(null)?.name ?? "";
				editor.replaceSelection("```character-info\nprofile: " + name + "\n```\n");
			},
		});
		this.addCommand({
			id: "open-data-note",
			name: "Open the default profile data note",
			callback: async () => {
				const profile = this.findProfile(null);
				if (!profile) {
					new Notice("Character Info: add a profile in settings first.");
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

	private findProfile(name: string | null | undefined): Profile | null {
		const { profiles, defaultProfile } = this.settings;
		const wanted = name?.toLowerCase();
		return (
			(wanted ? profiles.find((p) => p.name.toLowerCase() === wanted) : undefined) ??
			profiles.find((p) => p.id === defaultProfile) ??
			profiles[0] ??
			null
		);
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
		if (!this.settings.profiles.length) {
			const first = makeProfile("body", "Me", []);
			this.settings.profiles.push(first);
			this.settings.defaultProfile = first.id;
		}
	}

	private async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
