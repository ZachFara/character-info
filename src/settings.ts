import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import { MAPS, TEMPLATES, makeProfile, type TemplateKey } from "./presets.ts";
import { uniqueId } from "./data.ts";
import type { PluginSettings, Profile, State } from "./types.ts";

/** What the settings tab needs from the plugin. `settings` is edited in place. */
export interface SettingsActions {
	settings: PluginSettings;
	save: () => Promise<void>;
	createDataNote: (profile: Profile) => Promise<void>;
}

const NEW_STATE_COLOR = "#7a7a7a";
const MAX_PIPS = 5;

function isTemplateKey(key: string): key is TemplateKey {
	return key in TEMPLATES;
}

export class CharacterInfoSettingTab extends PluginSettingTab {
	private readonly open = new Set<string>();
	private newTemplate: TemplateKey = "character";
	private newName = "";
	private confirmDelete: string | null = null;

	constructor(
		app: App,
		plugin: Plugin,
		private readonly actions: SettingsActions,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.drawDefaultProfile();
		this.drawAddProfile();
		new Setting(this.containerEl).setName("Profiles").setHeading();
		for (const p of this.actions.settings.profiles) this.drawProfile(p);
	}

	/** Saves, then redraws so structural changes show up. */
	private async commit(): Promise<void> {
		await this.actions.save();
		this.display();
	}

	private drawDefaultProfile(): void {
		const s = this.actions.settings;
		new Setting(this.containerEl)
			.setName("Default profile")
			.setDesc("Used by a character-info block that names no profile.")
			.addDropdown((d) => {
				for (const p of s.profiles) d.addOption(p.id, p.name);
				d.setValue(s.defaultProfile !== "" ? s.defaultProfile : (s.profiles[0]?.id ?? ""));
				d.onChange(async (v) => {
					s.defaultProfile = v;
					await this.actions.save();
				});
			});
	}

	private drawAddProfile(): void {
		const s = this.actions.settings;
		new Setting(this.containerEl).setName("Add a profile").setHeading();
		new Setting(this.containerEl)
			.setName("Start from")
			.addDropdown((d) => {
				for (const [k, t] of Object.entries(TEMPLATES)) d.addOption(k, t.label);
				d.setValue(this.newTemplate);
				d.onChange((v) => {
					if (isTemplateKey(v)) this.newTemplate = v;
				});
			})
			.addText((t) =>
				t
					.setPlaceholder("Profile name")
					.setValue(this.newName)
					.onChange((v) => {
						this.newName = v;
					}),
			)
			.addButton((b) =>
				b
					.setButtonText("Add")
					.setCta()
					.onClick(async () => {
						const name = this.newName.trim();
						if (!name) return;
						const p = makeProfile(this.newTemplate, name, s.profiles);
						s.profiles.push(p);
						if (!s.defaultProfile) s.defaultProfile = p.id;
						this.open.add(p.id);
						this.newName = "";
						await this.commit();
					}),
			);
	}

	private drawProfile(p: Profile): void {
		const details = this.containerEl.createEl("details", { cls: "ci-settings-profile" });
		details.open = this.open.has(p.id);
		details.addEventListener("toggle", () => {
			if (details.open) this.open.add(p.id);
			else this.open.delete(p.id);
		});
		details.createEl("summary", { text: p.name });
		this.drawBasics(details, p);
		this.drawStates(details, p);
		this.drawRegions(details, p);
		this.drawManage(details, p);
	}

	private drawBasics(el: HTMLElement, p: Profile): void {
		new Setting(el).setName("Name").addText((t) =>
			t.setValue(p.name).onChange(async (v) => {
				p.name = v.trim() || p.name;
				await this.actions.save();
			}),
		);
		new Setting(el)
			.setName("Data note")
			.setDesc("The note that stores this profile's statuses. It is created on the first save.")
			.addText((t) =>
				t.setValue(p.dataPath).onChange(async (v) => {
					p.dataPath = v.trim() || p.dataPath;
					await this.actions.save();
				}),
			);
		new Setting(el)
			.setName("Map")
			.setDesc("Regions only appear on the map when their id matches a shape on it.")
			.addDropdown((d) => {
				for (const [k, m] of Object.entries(MAPS)) d.addOption(k, m.label);
				d.setValue(p.map);
				d.onChange(async (v) => {
					p.map = v;
					await this.commit();
				});
			});
	}

	private drawStates(el: HTMLElement, p: Profile): void {
		new Setting(el).setName("States").setHeading();
		new Setting(el)
			.setName("Default state")
			.setDesc("What a region shows before you set it.")
			.addDropdown((d) => {
				for (const st of p.states) d.addOption(st.id, st.label);
				d.setValue(p.defaultState);
				d.onChange(async (v) => {
					p.defaultState = v;
					await this.actions.save();
				});
			});
		for (const st of p.states) this.drawStateRow(el, p, st);

		let label = "";
		new Setting(el)
			.setName("Add a state")
			.addText((t) =>
				t.setPlaceholder("Label").onChange((v) => {
					label = v;
				}),
			)
			.addButton((b) =>
				b.setButtonText("Add").onClick(async () => {
					const text = label.trim();
					if (!text) return;
					const id = uniqueId(
						text,
						p.states.map((x) => x.id),
					);
					p.states.push({ id, label: text, color: NEW_STATE_COLOR, pips: 0, bad: false });
					await this.commit();
				}),
			);
	}

	private drawStateRow(el: HTMLElement, p: Profile, st: State): void {
		const locked = st.id === p.defaultState || p.states.length <= 1;
		new Setting(el)
			.setName(st.id)
			.addText((t) =>
				t.setValue(st.label).onChange(async (v) => {
					st.label = v;
					await this.actions.save();
				}),
			)
			.addColorPicker((c) =>
				c.setValue(st.color).onChange(async (v) => {
					st.color = v;
					await this.actions.save();
				}),
			)
			.addDropdown((d) => {
				for (let i = 0; i <= MAX_PIPS; i++) d.addOption(String(i), `${String(i)} pips`);
				d.setValue(String(st.pips));
				d.onChange(async (v) => {
					st.pips = Number(v);
					await this.actions.save();
				});
			})
			.addToggle((t) =>
				t
					.setTooltip("Counts as a problem: opens first and sorts as worst")
					.setValue(st.bad)
					.onChange(async (v) => {
						st.bad = v;
						await this.actions.save();
					}),
			)
			.addExtraButton((b) =>
				b
					.setIcon("trash")
					.setTooltip(locked ? "The default state cannot be deleted" : "Delete state")
					.setDisabled(locked)
					.onClick(async () => {
						p.states = p.states.filter((x) => x !== st);
						await this.commit();
					}),
			);
	}

	private drawRegions(el: HTMLElement, p: Profile): void {
		new Setting(el).setName("Regions").setHeading();
		for (const r of p.regions) {
			new Setting(el)
				.setName(r.id)
				.addText((t) =>
					t.setValue(r.name).onChange(async (v) => {
						r.name = v;
						await this.actions.save();
					}),
				)
				.addExtraButton((b) =>
					b
						.setIcon("trash")
						.setTooltip("Delete region")
						.onClick(async () => {
							p.regions = p.regions.filter((x) => x !== r);
							await this.commit();
						}),
				);
		}
		this.drawUnusedShapes(el, p);

		let name = "";
		new Setting(el)
			.setName("Add a region")
			.setDesc("A region with no map shape shows as a chip under the figure.")
			.addText((t) =>
				t.setPlaceholder("Name").onChange((v) => {
					name = v;
				}),
			)
			.addButton((b) =>
				b.setButtonText("Add").onClick(async () => {
					const text = name.trim();
					if (!text) return;
					const id = uniqueId(
						text,
						p.regions.map((x) => x.id),
					);
					p.regions.push({ id, name: text });
					await this.commit();
				}),
			);
	}

	private drawUnusedShapes(el: HTMLElement, p: Profile): void {
		const map = (MAPS as Record<string, { shapes: Record<string, string> } | undefined>)[p.map] ?? MAPS.none;
		const unused = Object.keys(map.shapes).filter((id) => !p.regions.some((r) => r.id === id));
		if (!unused.length) return;
		const row = new Setting(el).setName("Map regions not in this profile").setDesc("Click to add one.");
		for (const id of unused) {
			row.addButton((b) =>
				b.setButtonText(id).onClick(async () => {
					p.regions.push({ id, name: id });
					await this.commit();
				}),
			);
		}
	}

	private drawManage(el: HTMLElement, p: Profile): void {
		const s = this.actions.settings;
		new Setting(el)
			.setName("Manage profile")
			.addButton((b) =>
				b.setButtonText("Create data note").onClick(async () => {
					await this.actions.createDataNote(p);
				}),
			)
			.addButton((b) =>
				b.setButtonText("Duplicate").onClick(async () => {
					const copy = structuredClone(p);
					copy.name = `${p.name} copy`;
					copy.id = uniqueId(
						copy.name,
						s.profiles.map((x) => x.id),
					);
					copy.dataPath = `Character Info/${copy.name}.md`;
					s.profiles.push(copy);
					this.open.add(copy.id);
					await this.commit();
				}),
			)
			.addButton((b) =>
				b
					.setButtonText(this.confirmDelete === p.id ? "Click again to delete" : "Delete profile")
					.setWarning()
					.onClick(async () => {
						if (this.confirmDelete !== p.id) {
							this.confirmDelete = p.id;
							b.setButtonText("Click again to delete");
							return;
						}
						this.confirmDelete = null;
						s.profiles = s.profiles.filter((x) => x !== p);
						if (s.defaultProfile === p.id) s.defaultProfile = s.profiles[0]?.id ?? "";
						await this.commit();
					}),
			);
	}
}
