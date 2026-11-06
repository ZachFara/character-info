import { PluginSettingTab, Setting } from "obsidian";
import { MAPS, STATE_SETS, TEMPLATES } from "./presets.js";
import { uniqueId } from "./data.js";

export function defaultSettings() {
	return { profiles: [], defaultProfile: "" };
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/** A new profile from a template. `existing` is the current profile list, used to keep ids unique. */
export function makeProfile(templateKey, name, existing) {
	const t = TEMPLATES[templateKey] ?? TEMPLATES.blank;
	const set = STATE_SETS[t.stateSet];
	return {
		id: uniqueId(name, existing.map((p) => p.id)),
		name,
		map: t.map,
		states: clone(set.states),
		defaultState: set.defaultState,
		regions: clone(t.regions),
		dataPath: `Character Info/${name}.md`,
	};
}

export class CharacterInfoSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.open = new Set();
		this.newTemplate = "character";
		this.newName = "";
		this.confirmDelete = null;
	}

	display() {
		const { containerEl } = this;
		const s = this.plugin.settings;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default profile")
			.setDesc("Used by a character-info block that names no profile.")
			.addDropdown((d) => {
				for (const p of s.profiles) d.addOption(p.id, p.name);
				d.setValue(s.defaultProfile || s.profiles[0]?.id || "");
				d.onChange(async (v) => {
					s.defaultProfile = v;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName("Add a profile").setHeading();
		new Setting(containerEl)
			.setName("Start from")
			.addDropdown((d) => {
				for (const [k, t] of Object.entries(TEMPLATES)) d.addOption(k, t.label);
				d.setValue(this.newTemplate);
				d.onChange((v) => (this.newTemplate = v));
			})
			.addText((t) =>
				t.setPlaceholder("Profile name").setValue(this.newName).onChange((v) => (this.newName = v)),
			)
			.addButton((b) =>
				b.setButtonText("Add").setCta().onClick(async () => {
					const name = this.newName.trim();
					if (!name) return;
					const p = makeProfile(this.newTemplate, name, s.profiles);
					s.profiles.push(p);
					if (!s.defaultProfile) s.defaultProfile = p.id;
					this.open.add(p.id);
					this.newName = "";
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		new Setting(containerEl).setName("Profiles").setHeading();
		for (const p of s.profiles) this.drawProfile(containerEl, p);
	}

	drawProfile(parent, p) {
		const s = this.plugin.settings;
		const details = parent.createEl("details", { cls: "ci-settings-profile" });
		details.open = this.open.has(p.id);
		details.addEventListener("toggle", () => (details.open ? this.open.add(p.id) : this.open.delete(p.id)));
		details.createEl("summary", { text: p.name });

		const save = () => this.plugin.saveSettings();
		const redraw = async () => {
			await save();
			this.display();
		};

		new Setting(details).setName("Name").addText((t) =>
			t.setValue(p.name).onChange(async (v) => {
				p.name = v.trim() || p.name;
				await save();
			}),
		);
		new Setting(details)
			.setName("Data note")
			.setDesc("The note that stores this profile's statuses. It is created on the first save.")
			.addText((t) =>
				t.setValue(p.dataPath).onChange(async (v) => {
					p.dataPath = v.trim() || p.dataPath;
					await save();
				}),
			);
		new Setting(details)
			.setName("Map")
			.setDesc("Regions only appear on the map when their id matches a shape on it.")
			.addDropdown((d) => {
				for (const [k, m] of Object.entries(MAPS)) d.addOption(k, m.label);
				d.setValue(p.map);
				d.onChange(async (v) => {
					p.map = v;
					await redraw();
				});
			});

		new Setting(details).setName("States").setHeading();
		new Setting(details)
			.setName("Default state")
			.setDesc("What a region shows before you set it.")
			.addDropdown((d) => {
				for (const st of p.states) d.addOption(st.id, st.label);
				d.setValue(p.defaultState);
				d.onChange(async (v) => {
					p.defaultState = v;
					await save();
				});
			});
		for (const st of p.states) {
			new Setting(details)
				.setName(st.id)
				.addText((t) =>
					t.setValue(st.label).onChange(async (v) => {
						st.label = v;
						await save();
					}),
				)
				.addColorPicker((c) =>
					c.setValue(st.color).onChange(async (v) => {
						st.color = v;
						await save();
					}),
				)
				.addDropdown((d) => {
					for (let i = 0; i <= 5; i++) d.addOption(String(i), `${i} pips`);
					d.setValue(String(st.pips));
					d.onChange(async (v) => {
						st.pips = Number(v);
						await save();
					});
				})
				.addToggle((t) =>
					t.setTooltip("Counts as a problem: opens first and sorts as worst").setValue(st.bad).onChange(async (v) => {
						st.bad = v;
						await save();
					}),
				)
				.addExtraButton((b) =>
					b.setIcon("trash").setTooltip(st.id === p.defaultState ? "The default state cannot be deleted" : "Delete state")
						.setDisabled(st.id === p.defaultState || p.states.length <= 1)
						.onClick(async () => {
							p.states = p.states.filter((x) => x !== st);
							await redraw();
						}),
				);
		}
		let stateName = "";
		new Setting(details)
			.setName("Add a state")
			.addText((t) => t.setPlaceholder("Label").onChange((v) => (stateName = v)))
			.addButton((b) =>
				b.setButtonText("Add").onClick(async () => {
					const label = stateName.trim();
					if (!label) return;
					p.states.push({ id: uniqueId(label, p.states.map((x) => x.id)), label, color: "#7a7a7a", pips: 0, bad: false });
					await redraw();
				}),
			);

		new Setting(details).setName("Regions").setHeading();
		for (const r of p.regions) {
			new Setting(details)
				.setName(r.id)
				.addText((t) =>
					t.setValue(r.name).onChange(async (v) => {
						r.name = v;
						await save();
					}),
				)
				.addExtraButton((b) =>
					b.setIcon("trash").setTooltip("Delete region").onClick(async () => {
						p.regions = p.regions.filter((x) => x !== r);
						await redraw();
					}),
				);
		}
		const unused = Object.keys((MAPS[p.map] ?? MAPS.none).shapes).filter((id) => !p.regions.some((r) => r.id === id));
		if (unused.length) {
			const row = new Setting(details).setName("Map regions not in this profile").setDesc("Click to add one.");
			for (const id of unused) {
				row.addButton((b) =>
					b.setButtonText(id).onClick(async () => {
						p.regions.push({ id, name: id });
						await redraw();
					}),
				);
			}
		}
		let regionName = "";
		new Setting(details)
			.setName("Add a region")
			.setDesc("A region with no map shape shows as a chip under the figure.")
			.addText((t) => t.setPlaceholder("Name").onChange((v) => (regionName = v)))
			.addButton((b) =>
				b.setButtonText("Add").onClick(async () => {
					const name = regionName.trim();
					if (!name) return;
					p.regions.push({ id: uniqueId(name, p.regions.map((x) => x.id)), name });
					await redraw();
				}),
			);

		new Setting(details)
			.setName("Manage profile")
			.addButton((b) =>
				b.setButtonText("Create data note").onClick(async () => {
					await this.plugin.ensureDataFile(p);
				}),
			)
			.addButton((b) =>
				b.setButtonText("Duplicate").onClick(async () => {
					const copy = clone(p);
					copy.name = `${p.name} copy`;
					copy.id = uniqueId(copy.name, s.profiles.map((x) => x.id));
					copy.dataPath = `Character Info/${copy.name}.md`;
					s.profiles.push(copy);
					this.open.add(copy.id);
					await redraw();
				}),
			)
			.addButton((b) =>
				b.setButtonText(this.confirmDelete === p.id ? "Click again to delete" : "Delete profile")
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
						await redraw();
					}),
			);
	}
}
