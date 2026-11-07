import type { Profile } from "./types.ts";

/**
 * One button per state, with the current one marked. Picking a button marks it and reports the
 * choice. The edit form and the one-click row on the card both use this.
 */
export function drawStateButtons(
	parent: HTMLElement,
	profile: Profile,
	currentId: string,
	onPick: (id: string) => void,
): void {
	const row = parent.createDiv({ cls: "ci-states" });
	const buttons: { id: string; el: HTMLElement }[] = [];
	for (const s of profile.states) {
		const b = row.createEl("button", { cls: "ci-state" + (s.id === currentId ? " is-on" : "") });
		b.style.setProperty("--ci-c", s.color);
		b.createEl("i", { cls: "ci-dot" });
		b.appendText(s.label);
		b.addEventListener("click", () => {
			for (const x of buttons) x.el.toggleClass("is-on", x.id === s.id);
			onPick(s.id);
		});
		buttons.push({ id: s.id, el: b });
	}
}
