import { MarkdownRenderer } from "obsidian";
import { MAPS } from "./presets.js";
import { isUnknownStatus, pickInitial, readRegion, resolveState, tally } from "./data.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Turns a trusted preset string like `<rect .../>` into SVG nodes. */
function shapeNodes(markup) {
	const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${markup}</svg>`, "image/svg+xml");
	return Array.from(doc.documentElement.childNodes).map((n) => document.importNode(n, true));
}

function lines(value) {
	return value.split("\n").map((v) => v.trim()).filter(Boolean);
}

/**
 * Draws one profile into `el`. `getFrontmatter` returns the profile note's current frontmatter,
 * `save(regionId, patch)` writes an edit. Call the returned `redraw()` when the data changes.
 */
export function renderCharacterInfo({ app, el, profile, sourcePath, component, getFrontmatter, save }) {
	const map = MAPS[profile.map] ?? MAPS.none;
	let selected = null;
	let editing = false;

	function draw() {
		const fm = getFrontmatter();
		if (!selected || !profile.regions.some((r) => r.id === selected)) selected = pickInitial(profile, fm);
		el.empty();
		const root = el.createDiv({ cls: "character-info" });
		drawHeader(root, fm);
		const grid = root.createDiv({ cls: "ci-grid" });
		const hasMap = profile.regions.some((r) => map.shapes[r.id]);
		if (hasMap) drawFigure(grid, fm);
		const side = grid.createDiv({ cls: "ci-side" });
		drawCard(side, fm);
		drawRoster(side, fm);
	}

	function drawHeader(root, fm) {
		const head = root.createDiv({ cls: "ci-head" });
		head.createEl("h3", { cls: "ci-title", text: profile.name });
		const legend = head.createDiv({ cls: "ci-legend" });
		const counts = tally(profile, fm);
		for (const s of profile.states) {
			const item = legend.createSpan({ cls: counts[s.id] ? "" : "is-zero" });
			item.createEl("i", { cls: "ci-dot" }).style.background = s.color;
			item.appendText(`${s.label} `);
			item.createEl("b", { text: String(counts[s.id]) });
		}
	}

	function drawFigure(grid, fm) {
		const fig = grid.createEl("figure", { cls: "ci-fig" });
		const svg = document.createElementNS(SVG_NS, "svg");
		svg.setAttribute("viewBox", map.viewBox);
		svg.setAttribute("role", "img");
		svg.setAttribute("aria-label", `${profile.name}, regions coloured by state`);
		fig.appendChild(svg);

		const drawn = profile.regions.filter((r) => map.shapes[r.id]);
		const sil = document.createElementNS(SVG_NS, "g");
		sil.setAttribute("class", "ci-silhouette");
		for (const r of drawn) shapeNodes(map.shapes[r.id]).forEach((n) => sil.appendChild(n));
		svg.appendChild(sil);

		const caption = fig.createEl("figcaption", { text: "Select a region" });
		for (const r of drawn) {
			const color = resolveState(profile, readRegion(fm, r.id).status).color;
			const g = document.createElementNS(SVG_NS, "g");
			g.setAttribute("class", "ci-region" + (r.id === selected ? " is-sel" : ""));
			g.dataset.region = r.id;
			g.style.fill = color;
			g.style.stroke = color;
			shapeNodes(map.shapes[r.id]).forEach((n) => g.appendChild(n));
			g.addEventListener("click", () => select(r.id));
			g.addEventListener("mouseenter", () => (caption.textContent = r.name));
			g.addEventListener("mouseleave", () => (caption.textContent = "Select a region"));
			svg.appendChild(g);
		}
	}

	function drawRoster(side, fm) {
		const roster = side.createDiv({ cls: "ci-roster" });
		for (const r of profile.regions) {
			const s = resolveState(profile, readRegion(fm, r.id).status);
			const chip = roster.createEl("button", { cls: "ci-chip" + (r.id === selected ? " is-sel" : "") });
			chip.style.setProperty("--ci-c", s.color);
			chip.createEl("i", { cls: "ci-dot" });
			chip.appendText(r.name);
			chip.addEventListener("click", () => select(r.id));
		}
	}

	function select(id) {
		selected = id;
		editing = false;
		draw();
	}

	function md(target, text) {
		void MarkdownRenderer.render(app, text, target, sourcePath, component);
	}

	function list(card, title, items, cls) {
		if (!items.length) return;
		const sec = card.createDiv({ cls: `ci-sec ${cls}` });
		sec.createDiv({ cls: "ci-sec-title", text: title });
		const ul = sec.createEl("ul");
		for (const item of items) md(ul.createEl("li"), item);
	}

	function drawCard(side, fm) {
		const card = side.createDiv({ cls: "ci-card" });
		const region = profile.regions.find((r) => r.id === selected);
		if (!region) {
			card.createDiv({ cls: "ci-empty", text: "This profile has no regions yet. Add some in the plugin settings." });
			return;
		}
		const data = readRegion(fm, region.id);
		const state = resolveState(profile, data.status);
		card.style.setProperty("--ci-c", state.color);

		const top = card.createDiv({ cls: "ci-card-top" });
		top.createDiv({ cls: "ci-name", text: region.name });
		const edit = top.createEl("button", { cls: "ci-edit", text: editing ? "Cancel" : "Edit" });
		edit.addEventListener("click", () => {
			editing = !editing;
			draw();
		});

		const stat = card.createDiv({ cls: "ci-stat" });
		const label = stat.createSpan();
		label.createEl("i", { cls: "ci-dot" });
		label.appendText(state.label);
		const pips = stat.createSpan({ cls: "ci-pips" });
		for (let i = 0; i < 5; i++) pips.createEl("i", { cls: i < state.pips ? "is-on" : "" });

		if (isUnknownStatus(profile, data.status)) {
			card.createDiv({
				cls: "ci-warn",
				text: `Status "${data.status}" is not one of ${profile.states.map((s) => s.id).join(", ")}, so it shows as ${state.label}.`,
			});
		}

		if (editing) return drawEditor(card, region, data, state);

		if (data.note) md(card.createDiv({ cls: "ci-note" }), data.note);
		list(card, "Doing", data.doing, "doing");
		list(card, "To fix", data.fix, "fix");
		list(card, "Notes", data.links, "links");
		if (data.history.length) {
			const details = card.createEl("details", { cls: "ci-sec history" });
			details.createEl("summary", { text: `History (${data.history.length})` });
			const ul = details.createEl("ul");
			const name = (id) => profile.states.find((s) => s.id === id)?.label ?? id;
			for (const h of [...data.history].reverse()) ul.createEl("li", { text: `${h.date}: ${name(h.from)} to ${name(h.to)}` });
		}
		if (!data.note && !data.doing.length && !data.fix.length && !data.links.length) {
			card.createDiv({ cls: "ci-empty", text: "Nothing logged yet." });
		}
	}

	function drawEditor(card, region, data, state) {
		const form = card.createDiv({ cls: "ci-form" });
		let status = state.id;

		const row = form.createDiv({ cls: "ci-states" });
		const buttons = [];
		for (const s of profile.states) {
			const b = row.createEl("button", { cls: "ci-state" + (s.id === status ? " is-on" : "") });
			b.style.setProperty("--ci-c", s.color);
			b.createEl("i", { cls: "ci-dot" });
			b.appendText(s.label);
			b.addEventListener("click", () => {
				status = s.id;
				buttons.forEach((x) => x.el.toggleClass("is-on", x.id === status));
			});
			buttons.push({ id: s.id, el: b });
		}

		const field = (title, value, placeholder, rows) => {
			form.createEl("label", { cls: "ci-label", text: title });
			const ta = form.createEl("textarea", { cls: "ci-text", attr: { rows: String(rows), placeholder } });
			ta.value = value;
			return ta;
		};
		const note = field("Note", data.note, "What is going on with it", 3);
		const doing = field("Doing (one per line)", data.doing.join("\n"), "What I am doing for it", 2);
		const fix = field("To fix (one per line)", data.fix.join("\n"), "What I should do next", 2);
		const links = field("Notes (one per line)", data.links.join("\n"), "[[Related note]]", 2);

		const actions = form.createDiv({ cls: "ci-actions" });
		const saveBtn = actions.createEl("button", { cls: "mod-cta", text: "Save" });
		saveBtn.addEventListener("click", async () => {
			saveBtn.disabled = true;
			await save(region.id, {
				status: status === state.id && !data.status ? undefined : status,
				note: note.value,
				doing: lines(doing.value),
				fix: lines(fix.value),
				links: lines(links.value),
			});
			editing = false;
			draw();
		});
	}

	draw();
	return { redraw: draw };
}
