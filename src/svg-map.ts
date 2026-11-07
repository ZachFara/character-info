// Turns an SVG file from the vault into a map. The file is untrusted, so nothing from it is
// inserted as is: only plain shapes and a fixed list of geometry attributes are rebuilt into new
// markup. Scripts, styles, links, images, text and event handlers are dropped.
import type { MapPreset } from "./presets.ts";
import type { Profile, Region } from "./types.ts";

const SHAPES = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "g"]);
const ATTRIBUTES = new Set([
	"d",
	"x",
	"y",
	"width",
	"height",
	"rx",
	"ry",
	"cx",
	"cy",
	"r",
	"points",
	"x1",
	"y1",
	"x2",
	"y2",
	"transform",
]);
const SAFE_VALUE = /^[-0-9a-zA-Z.,\s()#%]*$/;

export type SvgMapResult =
	{ ok: true; map: MapPreset; names: Record<string, string> } | { ok: false; error: string };

/** True when a block's map value names an SVG file rather than a built-in map. */
export function isSvgPath(map: string): boolean {
	return map.trim().toLowerCase().endsWith(".svg");
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Rebuilds one element from the allowed shapes and attributes only. Anything else becomes nothing. */
function rebuild(el: Element): string {
	const tag = el.localName;
	if (!SHAPES.has(tag)) return "";
	const attrs = [...el.attributes]
		.filter((a) => ATTRIBUTES.has(a.localName) && SAFE_VALUE.test(a.value))
		.map((a) => ` ${a.localName}="${escapeAttr(a.value)}"`)
		.join("");
	// A shape left with no geometry once unsafe values are removed draws nothing, so it is dropped.
	if (tag !== "g") return attrs ? `<${tag}${attrs}/>` : "";
	return `<g${attrs}>${[...el.children].map(rebuild).join("")}</g>`;
}

function readableName(el: Element, id: string): string {
	const named = el.getAttribute("data-name") ?? el.querySelector(":scope > title")?.textContent ?? "";
	if (named.trim()) return named.trim();
	const words = id.replace(/[-_]+/g, " ").trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function readViewBox(svg: Element): string | null {
	const box = svg.getAttribute("viewBox");
	if (box && /^\s*-?[\d.]+([\s,]+-?[\d.]+){3}\s*$/.test(box)) return box.trim().replace(/,/g, " ");
	const w = Number.parseFloat(svg.getAttribute("width") ?? "");
	const h = Number.parseFloat(svg.getAttribute("height") ?? "");
	return w > 0 && h > 0 ? `0 0 ${String(w)} ${String(h)}` : null;
}

/** One shape per outermost element with a usable id, with a readable name for each. */
function collectShapes(svg: Element): { shapes: Record<string, string>; names: Record<string, string> } {
	const shapes: Record<string, string> = {};
	const names: Record<string, string> = {};
	for (const el of svg.querySelectorAll("[id]")) {
		const id = el.getAttribute("id") ?? "";
		// A shape inside another shape with an id belongs to that one. The root <svg> does not count.
		const owner = el.parentElement?.closest("[id]");
		const nested = owner !== null && owner !== undefined && owner !== svg;
		if (!/^[\w-]+$/.test(id) || nested || id in shapes) continue;
		const markup = rebuild(el);
		if (!markup) continue;
		shapes[id] = markup;
		names[id] = readableName(el, id);
	}
	return { shapes, names };
}

/** Parses SVG text into a map: one shape per outermost element with an id. */
export function parseSvgMap(text: string, label: string): SvgMapResult {
	const doc = new DOMParser().parseFromString(text, "image/svg+xml");
	const svg = doc.documentElement;
	if (svg.localName !== "svg" || doc.getElementsByTagName("parsererror").length) {
		return { ok: false, error: "The file is not a readable SVG." };
	}
	const viewBox = readViewBox(svg);
	if (!viewBox) return { ok: false, error: "The SVG needs a viewBox, or a width and height." };
	const { shapes, names } = collectShapes(svg);
	if (!Object.keys(shapes).length) {
		return {
			ok: false,
			error: 'No shapes with an id. Give each part of the drawing an id, such as id="left_wing".',
		};
	}
	return { ok: true, map: { label, viewBox, shapes }, names };
}

/** A profile with no regions of its own takes one region per shape in its SVG map. */
export function withMapRegions(profile: Profile, map: MapPreset, names: Record<string, string>): Profile {
	if (profile.regions.length) return profile;
	const regions: Region[] = Object.keys(map.shapes).map((id) => ({ id, name: names[id] ?? id }));
	return { ...profile, regions };
}
