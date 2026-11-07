import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import type { PluginSettings, Profile } from "./types.ts";

/** What the settings tab needs from the plugin. `settings` is edited in place. */
export interface SettingsActions {
	settings: PluginSettings;
	save: () => Promise<void>;
	openDataNote: (profile: Profile) => Promise<void>;
}

export class CharacterInfoSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly actions: SettingsActions,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Profiles are defined by the text of a character-info block in a note. This list follows them automatically.",
		});
		this.drawFeatures();
		this.drawDefaultProfile();
		new Setting(this.containerEl).setName("Profiles").setHeading();
		const { profiles } = this.actions.settings;
		if (!profiles.length) {
			this.containerEl.createEl("p", {
				cls: "setting-item-description",
				text: "None yet. Run the command “New profile”, or write a character-info block with a profile line.",
			});
		}
		for (const p of profiles) this.drawProfile(p);
	}

	private drawFeatures(): void {
		const s = this.actions.settings;
		new Setting(this.containerEl)
			.setName("Inventory")
			.setDesc(
				"Show an inventory under each profile: weapons, armor and gear, stored in the profile's data note.",
			)
			.addToggle((t) =>
				t.setValue(s.features.inventory).onChange(async (v) => {
					s.features.inventory = v;
					await this.actions.save();
				}),
			);
	}

	private drawDefaultProfile(): void {
		const s = this.actions.settings;
		new Setting(this.containerEl)
			.setName("Default profile")
			.setDesc("Used by a block that has no profile line.")
			.addDropdown((d) => {
				for (const p of s.profiles) d.addOption(p.id, p.name);
				d.setValue(s.defaultProfile !== "" ? s.defaultProfile : (s.profiles[0]?.id ?? ""));
				d.onChange(async (v) => {
					s.defaultProfile = v;
					await this.actions.save();
				});
			});
	}

	private drawProfile(p: Profile): void {
		const s = this.actions.settings;
		const detail = `Template: ${p.template}. ${String(p.regions.length)} regions. Data: ${p.dataPath}`;
		new Setting(this.containerEl)
			.setName(p.name)
			.setDesc(detail)
			.addButton((b) =>
				b.setButtonText("Open data note").onClick(async () => {
					await this.actions.openDataNote(p);
				}),
			)
			.addButton((b) =>
				b
					.setButtonText("Forget")
					.setTooltip(
						"Removes it from this list. The data note stays, and a block that defines it adds it back.",
					)
					.setWarning()
					.onClick(async () => {
						s.profiles = s.profiles.filter((x) => x !== p);
						if (s.defaultProfile === p.id) s.defaultProfile = s.profiles[0]?.id ?? "";
						await this.actions.save();
						this.display();
					}),
			);
	}
}
