import { Modal, Setting, type App } from "obsidian";
import { TEMPLATES, type TemplateKey } from "./presets.ts";
import type { BlockMode } from "./profile-text.ts";

/** Asks for a profile's name and template, then hands them back. Nothing is written here. */
export class NewProfileModal extends Modal {
	private name = "";
	private template: TemplateKey = "character";

	constructor(
		app: App,
		private readonly mode: BlockMode,
		private readonly onSubmit: (name: string, template: TemplateKey) => void,
	) {
		super(app);
	}

	override onOpen(): void {
		this.setTitle(this.mode === "full" ? "New profile, full template" : "New profile");
		const { contentEl } = this;
		new Setting(contentEl).setName("Name").addText((t) => {
			t.setPlaceholder("Thorn").onChange((v) => {
				this.name = v;
			});
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") this.submit();
			});
			t.inputEl.focus();
		});
		new Setting(contentEl).setName("Start from").addDropdown((d) => {
			for (const [key, t] of Object.entries(TEMPLATES)) d.addOption(key, t.label);
			d.setValue(this.template);
			d.onChange((v) => {
				if (v in TEMPLATES) this.template = v as TemplateKey;
			});
		});
		new Setting(contentEl).addButton((b) =>
			b
				.setButtonText("Insert")
				.setCta()
				.onClick(() => {
					this.submit();
				}),
		);
	}

	private submit(): void {
		const name = this.name.trim();
		if (!name) return;
		this.close();
		this.onSubmit(name, this.template);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
