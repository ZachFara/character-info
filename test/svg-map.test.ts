import { test } from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./harness.ts";
import { makeProfile } from "../src/presets.ts";
import type * as SvgMap from "../src/svg-map.ts";

const { parseSvgMap, withMapRegions, isSvgPath } = await loadModule<typeof SvgMap>("src/svg-map.ts");

const KAEL = `<svg xmlns="http://www.w3.org/2000/svg" id="kael" viewBox="0 0 100 220">
  <title>Kael, a winged character</title>
  <rect x="0" y="0" width="100" height="220" fill="white"/>
  <g id="torso" data-name="Chest and belly" transform="translate(0 4)">
    <path d="M35 50 L65 50 L62 110 L38 110 Z" fill="red" onclick="alert(1)" style="fill:red"/>
    <circle id="heart" cx="50" cy="70" r="4"/>
  </g>
  <circle id="head" cx="50" cy="25" r="18"><title>Head and face</title></circle>
  <polygon id="left_wing" points="62,55 98,30 72,105"/>
  <script>alert("no")</script>
  <image id="logo" href="https://example.com/x.png" width="10" height="10"/>
  <foreignObject id="html"><div>no</div></foreignObject>
  <path id="bad" d="javascript:alert(1)"/>
</svg>`;

function ok(text: string): Extract<SvgMap.SvgMapResult, { ok: true }> {
	const r = parseSvgMap(text, "Kael");
	if (!r.ok) assert.fail(r.error);
	return r;
}

test("an svg path is told apart from a built-in map name", () => {
	assert.equal(isSvgPath("Maps/kael.svg"), true);
	assert.equal(isSvgPath(" kael.SVG "), true);
	assert.equal(isSvgPath("humanoid"), false);
});

test("each outermost shape with an id becomes a region shape, even when the svg itself has an id", () => {
	const { map } = ok(KAEL);
	assert.equal(map.viewBox, "0 0 100 220");
	assert.deepEqual(Object.keys(map.shapes).sort(), ["head", "left_wing", "torso"]);
	assert.equal(map.label, "Kael");
});

test("names come from data-name, then a title, then the id made readable", () => {
	const { names } = ok(KAEL);
	assert.equal(names.torso, "Chest and belly");
	assert.equal(names.head, "Head and face");
	assert.equal(names.left_wing, "Left wing");
});

test("only plain shapes and geometry survive: no scripts, styles, handlers, colours, links or images", () => {
	const all = Object.values(ok(KAEL).map.shapes).join("");
	for (const banned of [
		"script",
		"onclick",
		"style",
		"fill",
		"href",
		"image",
		"foreignObject",
		"javascript",
		"alert",
	]) {
		assert.equal(all.includes(banned), false, `${banned} leaked`);
	}
	assert.ok(all.includes('transform="translate(0 4)"'));
	assert.ok(all.includes('d="M35 50 L65 50 L62 110 L38 110 Z"'));
});

test("width and height stand in for a missing viewBox", () => {
	const { map } = ok(
		'<svg xmlns="http://www.w3.org/2000/svg" width="50" height="30"><rect id="a" width="5" height="5"/></svg>',
	);
	assert.equal(map.viewBox, "0 0 50 30");
});

test("unusable files say what is wrong", () => {
	const error = (text: string): string => {
		const r = parseSvgMap(text, "X");
		if (r.ok) assert.fail("expected an error");
		return r.error;
	};
	assert.match(error("not svg at all <"), /not a readable SVG/);
	assert.match(error('<svg xmlns="http://www.w3.org/2000/svg"><rect id="a"/></svg>'), /viewBox/);
	assert.match(
		error('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect/></svg>'),
		/id="left_wing"/,
	);
});

test("a profile with no regions takes one per shape, and one with regions keeps its own", () => {
	const { map, names } = ok(KAEL);
	const blank = { ...makeProfile("blank", "Kael", []), map: "kael.svg" };
	assert.deepEqual(
		withMapRegions(blank, map, names).regions.map((r) => [r.id, r.name]),
		[
			["torso", "Chest and belly"],
			["head", "Head and face"],
			["left_wing", "Left wing"],
		],
	);
	const own = { ...blank, regions: [{ id: "head", name: "Head" }] };
	assert.equal(withMapRegions(own, map, names), own);
});
