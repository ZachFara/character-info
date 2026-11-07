import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlock } from "../src/data.ts";
import { isDefinition, newProfileBlock, resolveDefinition, type ResolveResult } from "../src/profile-text.ts";
import { TEMPLATES, makeProfile, type TemplateKey } from "../src/presets.ts";
import type { Profile } from "../src/types.ts";

function resolve(text: string, existing?: Profile): Extract<ResolveResult, { ok: true }> {
	const result = resolveDefinition(parseBlock(text), existing);
	if (!result.ok) assert.fail(result.error);
	return result;
}

function failure(text: string): string {
	const result = resolveDefinition(parseBlock(text), undefined);
	if (result.ok) assert.fail("expected an error");
	return result.error;
}

test("a block with only a profile line is a reference, not a definition", () => {
	assert.equal(isDefinition(parseBlock("profile: Thorn")), false);
	assert.equal(isDefinition(parseBlock("profile: Thorn\nadd:\nstates:")), false);
	assert.equal(isDefinition(parseBlock("profile: Thorn\ntemplate: character")), true);
});

test("a template gives the starting regions, states and map", () => {
	const { profile } = resolve("profile: Thorn\ntemplate: character");
	assert.equal(profile.name, "Thorn");
	assert.equal(profile.id, "thorn");
	assert.equal(profile.map, "humanoid");
	assert.equal(profile.regions.length, 6);
	assert.equal(profile.defaultState, "healthy");
	assert.equal(profile.dataPath, "Character Info/Thorn.md");
});

test("without a template a defining block starts blank", () => {
	const { profile } = resolve("profile: Civic\nadd: Engine, Brakes");
	assert.equal(profile.template, "blank");
	assert.deepEqual(
		profile.regions.map((r) => r.name),
		["Engine", "Brakes"],
	);
});

test("add, remove and rename change the regions and keep ids stable", () => {
	const { profile, warnings } = resolve(
		"profile: Thorn\ntemplate: character\nadd: Tail, Wings\nremove: Torso\nrename: Left arm = Sword arm; Head = Skull",
	);
	const names = profile.regions.map((r) => r.name);
	assert.deepEqual(names, ["Skull", "Right arm", "Sword arm", "Right leg", "Left leg", "Tail", "Wings"]);
	assert.equal(profile.regions.find((r) => r.name === "Sword arm")?.id, "armL");
	assert.equal(profile.regions.find((r) => r.name === "Tail")?.id, "tail");
	assert.deepEqual(warnings, []);
});

test("a removed part comes back with its map shape when added by name", () => {
	const { profile } = resolve("profile: Me\ntemplate: body\nremove: Neck & Posture\nadd: neck");
	assert.equal(profile.regions.find((r) => r.id === "neck")?.name, "neck");
});

test("regions can be matched by name or id, ignoring case", () => {
	const { profile } = resolve("profile: Thorn\ntemplate: character\nremove: armr, LEFT LEG");
	assert.equal(profile.regions.length, 4);
});

test("unknown names in remove, rename and default are warnings, not errors", () => {
	const { warnings } = resolve(
		"profile: Thorn\ntemplate: character\nremove: Nose\nrename: Beak = Face\ndefault: Fine",
	);
	assert.equal(warnings.length, 3);
	assert.match(warnings.join("\n"), /Nose/);
	assert.match(warnings.join("\n"), /Beak/);
	assert.match(warnings.join("\n"), /Fine/);
});

test("a rename with no equals sign is reported", () => {
	assert.match(resolve("profile: A\ntemplate: character\nrename: Head").warnings.join(), /Old = New/);
});

test("states replace the template's states, best first, with the first as the default", () => {
	const { profile } = resolve(
		"profile: Thorn\ntemplate: character\nstates: Healthy, Bruised, Wounded, Maimed, Lost",
	);
	assert.deepEqual(
		profile.states.map((s) => s.id),
		["healthy", "bruised", "wounded", "maimed", "lost"],
	);
	assert.equal(profile.defaultState, "healthy");
	assert.deepEqual(
		profile.states.map((s) => s.pips),
		[5, 4, 3, 1, 0],
	);
	assert.deepEqual(
		profile.states.map((s) => s.bad),
		[false, true, true, true, true],
	);
	assert.equal(new Set(profile.states.map((s) => s.color)).size, 5);
});

test("a state can carry its own colour and the default can be named", () => {
	const { profile } = resolve("profile: Car\nstates: Good, Worn=#123abc, Broken\ndefault: Worn");
	const [good, worn] = profile.states;
	assert.ok(good && worn);
	assert.equal(worn.color, "#123abc");
	assert.equal(profile.defaultState, "worn");
	assert.equal(worn.bad, false);
	assert.equal(good.bad, true);
});

test("two and three states get sensible colour ramps and one state works", () => {
	assert.deepEqual(
		resolve("profile: A\nstates: Ok, Bad").profile.states.map((s) => s.color),
		["#5aa469", "#e5534b"],
	);
	assert.equal(resolve("profile: A\nstates: Only").profile.states.length, 1);
	assert.equal(resolve("profile: A\nstates: A, B, C, D, E, F, G").profile.states.length, 7);
});

test("duplicate state names get unique ids", () => {
	const ids = resolve("profile: A\nstates: Fine, Fine").profile.states.map((s) => s.id);
	assert.deepEqual(ids, ["fine", "fine-2"]);
});

test("default alone picks one of the template's states", () => {
	const { profile } = resolve("profile: Me\ntemplate: body\ndefault: Maintaining");
	assert.equal(profile.defaultState, "ok");
});

test("map overrides the template's map", () => {
	assert.equal(resolve("profile: Thorn\ntemplate: body\nmap: humanoid").profile.map, "humanoid");
	assert.equal(resolve("profile: Thorn\ntemplate: body\nmap: none").profile.map, "none");
});

test("comment lines and empty keys are ignored", () => {
	const { profile } = resolve(
		"profile: Thorn\n# the starting point\ntemplate: character\nadd:\n# remove: Head\nremove:",
	);
	assert.equal(profile.regions.length, 6);
});

test("bad input is an error that says what to do", () => {
	assert.match(failure("profile: Thorn\ntemplate: wizard"), /Unknown template/);
	assert.match(failure("profile: Thorn\ntemplate: body\nmap: moon"), /Unknown map/);
	assert.match(failure("profile: Thorn\nstates: ,  ,"), /no states|Add a line/);
	assert.match(failure("template: body"), /profile:/);
});

test("an existing registry entry lends its id and template, and the block stays the source of truth", () => {
	const first = resolve("profile: Thorn\ntemplate: character\nadd: Tail").profile;
	const existing: Profile = { ...first, id: "thorn-9" };
	const again = resolve("profile: Thorn\nadd: Wings", existing).profile;
	assert.equal(again.id, "thorn-9");
	assert.equal(again.template, "character");
	assert.equal(
		again.regions.some((r) => r.id === "tail"),
		false,
	);
	assert.equal(
		again.regions.some((r) => r.id === "wings"),
		true,
	);
});

test("resolving the same text twice gives the same profile", () => {
	const text = "profile: Thorn\ntemplate: character\nadd: Tail\nstates: A, B, C";
	assert.deepEqual(resolve(text).profile, resolve(text, resolve(text).profile).profile);
});

/** The text between the fences of a generated block. */
function inner(block: string): string {
	const lines = block.split("\n");
	assert.equal(lines[0], "```character-info");
	assert.equal(lines.at(-2), "```");
	return lines.slice(1, -2).join("\n");
}

const KEYS = Object.keys(TEMPLATES) as TemplateKey[];

test("the simple block is a fenced block with the name and template", () => {
	assert.equal(
		newProfileBlock("Thorn", "character", "simple"),
		"```character-info\nprofile: Thorn\ntemplate: character\n```\n",
	);
});

test("the full block lists every key and explains each with a comment", () => {
	const text = inner(newProfileBlock("Thorn", "character", "full"));
	for (const key of [
		"profile:",
		"template:",
		"map:",
		"add:",
		"remove:",
		"rename:",
		"# states:",
		"# default:",
	]) {
		assert.ok(text.includes(key), `missing ${key}`);
	}
	assert.match(text, /# It has: Head, Torso, Right arm, Left arm, Right leg, Left leg/);
	assert.match(text, /# states: Healthy, Bruised, Wounded, Maimed, Lost/);
	assert.match(text, /# default: Healthy/);
	assert.ok(text.split("\n").filter((l) => l.startsWith("#")).length >= 4);
});

for (const key of KEYS) {
	for (const mode of ["simple", "full"] as const) {
		test(`a new ${mode} block for the ${key} template gives back exactly that template`, () => {
			const block = newProfileBlock("Pat", key, mode);
			assert.equal(isDefinition(parseBlock(inner(block))), true);
			assert.deepEqual(resolve(inner(block)).profile, makeProfile(key, "Pat", []));
		});
	}
}

test("uncommenting the states and default lines in a full block changes the profile as written", () => {
	const text = inner(newProfileBlock("Thorn", "character", "full"))
		.replace("# states: Healthy,", "states: Fine,")
		.replace("# default: Healthy", "default: Fine");
	const { profile } = resolve(text);
	assert.equal(profile.states[0]?.label, "Fine");
	assert.equal(profile.defaultState, "fine");
});
