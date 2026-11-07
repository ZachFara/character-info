import { test } from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./harness.ts";
import { makeProfile } from "../src/presets.ts";
import type * as SvgMap from "../src/svg-map.ts";

const { parseSvgMap, withMapRegions, isSvgPath } = await loadModule<typeof SvgMap>("src/svg-map.ts");

const SHIP = `<svg xmlns="http://www.w3.org/2000/svg" id="ship" viewBox="0 0 200 100">
  <title>A ship</title>
  <rect x="0" y="0" width="200" height="100" fill="white"/>
  <g id="hull" data-name="Hull plating" transform="translate(10 10)">
    <path d="M0 50 L180 50 L160 80 L20 80 Z" fill="red" onclick="alert(1)" style="fill:red"/>
    <rect id="porthole" x="40" y="55" width="8" height="8"/>
  </g>
  <circle id="engine" cx="20" cy="40" r="8"><title>Main engine</title></circle>
  <polygon id="sail_mast" points="100,0 110,40 90,40"/>
  <script>alert("no")</script>
  <image id="logo" href="https://example.com/x.png" width="10" height="10"/>
  <foreignObject id="html"><div>no</div></foreignObject>
  <path id="bad" d="javascript:alert(1)"/>
</svg>`;

function ok(text: string): Extract<SvgMap.SvgMapResult, { ok: true }> {
	const r = parseSvgMap(text, "Ship");
	if (!r.ok) assert.fail(r.error);
	return r;
}

test("an svg path is told apart from a built-in map name", () => {
	assert.equal(isSvgPath("Maps/ship.svg"), true);
	assert.equal(isSvgPath(" ship.SVG "), true);
	assert.equal(isSvgPath("humanoid"), false);
});

test("each outermost shape with an id becomes a region shape, even when the svg itself has an id", () => {
	const { map } = ok(SHIP);
	assert.equal(map.viewBox, "0 0 200 100");
	assert.deepEqual(Object.keys(map.shapes).sort(), ["engine", "hull", "sail_mast"]);
	assert.equal(map.label, "Ship");
});

test("names come from data-name, then a title, then the id made readable", () => {
	const { names } = ok(SHIP);
	assert.equal(names.hull, "Hull plating");
	assert.equal(names.engine, "Main engine");
	assert.equal(names.sail_mast, "Sail mast");
});

test("only plain shapes and geometry survive: no scripts, styles, handlers, colours, links or images", () => {
	const all = Object.values(ok(SHIP).map.shapes).join("");
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
	assert.ok(all.includes('transform="translate(10 10)"'));
	assert.ok(all.includes('d="M0 50 L180 50 L160 80 L20 80 Z"'));
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
		/id="engine"/,
	);
});

test("a profile with no regions takes one per shape, and one with regions keeps its own", () => {
	const { map, names } = ok(SHIP);
	const blank = { ...makeProfile("blank", "Ship", []), map: "ship.svg" };
	assert.deepEqual(
		withMapRegions(blank, map, names).regions.map((r) => [r.id, r.name]),
		[
			["hull", "Hull plating"],
			["engine", "Main engine"],
			["sail_mast", "Sail mast"],
		],
	);
	const own = { ...blank, regions: [{ id: "hull", name: "Hull" }] };
	assert.equal(withMapRegions(own, map, names), own);
});
