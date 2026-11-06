import { test } from "node:test";
import assert from "node:assert/strict";
import {
	applyEdit,
	isUnknownStatus,
	normalizeSettings,
	parseBlock,
	pickInitial,
	readRegion,
	resolveState,
	slug,
	tally,
	toList,
	uniqueId,
} from "../src/data.ts";
import { STATE_SETS, TEMPLATES, getMap, makeProfile } from "../src/presets.ts";
import type { Frontmatter, Profile } from "../src/types.ts";

const profile: Profile = {
	id: "me",
	name: "Me",
	map: "body",
	states: STATE_SETS.maintenance.states,
	defaultState: "unknown",
	regions: TEMPLATES.body.regions.slice(0, 4),
	dataPath: "Character Info/Me.md",
};

test("slug and uniqueId", () => {
	assert.equal(slug("Hips & Low Back"), "hips-low-back");
	assert.equal(slug("!!!"), "item");
	assert.equal(uniqueId("Knee", ["knee", "knee-2"]), "knee-3");
});

test("toList accepts arrays, strings and nothing", () => {
	assert.deepEqual(toList([" a ", "", "b", 3, {}]), ["a", "b", "3"]);
	assert.deepEqual(toList("a\n\n b "), ["a", "b"]);
	assert.deepEqual(toList(undefined), []);
});

test("unset and unknown statuses fall back to the default state", () => {
	assert.equal(resolveState(profile, null).id, "unknown");
	assert.equal(resolveState(profile, "nonsense").id, "unknown");
	assert.equal(isUnknownStatus(profile, "nonsense"), true);
	assert.equal(isUnknownStatus(profile, "hurt"), false);
	assert.equal(isUnknownStatus(profile, null), false);
});

test("tally counts every region once", () => {
	const fm: Frontmatter = { regions: { head: { status: "ok" }, neck: { status: "hurt" } } };
	const t = tally(profile, fm);
	assert.equal(t.ok, 1);
	assert.equal(t.hurt, 1);
	assert.equal(t.unknown, 2);
});

test("pickInitial opens the worst bad region", () => {
	const fm: Frontmatter = { regions: { head: { status: "watch" }, neck: { status: "hurt" } } };
	assert.equal(pickInitial(profile, fm), "neck");
	assert.equal(pickInitial(profile, {}), "head");
});

test("a status change appends history and an unchanged status does not", () => {
	const fm: Frontmatter = {};
	applyEdit(fm, profile, "head", { status: "hurt" }, "2026-11-06");
	assert.deepEqual(readRegion(fm, "head").history, [{ date: "2026-11-06", from: "unknown", to: "hurt" }]);
	applyEdit(fm, profile, "head", { status: "hurt", note: "ouch" }, "2026-11-07");
	assert.equal(readRegion(fm, "head").history.length, 1);
	applyEdit(fm, profile, "head", { status: "ok" }, "2026-11-08");
	assert.equal(readRegion(fm, "head").history.length, 2);
	assert.equal(readRegion(fm, "head").note, "ouch");
});

test("empty fields are removed from the stored region", () => {
	const fm: Frontmatter = { regions: { head: { note: "x", doing: ["a"] } } };
	applyEdit(fm, profile, "head", { note: "  ", doing: [] });
	const stored = JSON.stringify(fm);
	assert.equal(stored.includes('"note"'), false);
	assert.equal(stored.includes('"doing"'), false);
});

test("malformed history entries are ignored when reading", () => {
	const fm: Frontmatter = {
		regions: { head: { history: [{ date: "2026-11-01", from: "a", to: "b" }, "junk", { date: 5 }] } },
	};
	assert.equal(readRegion(fm, "head").history.length, 1);
});

test("parseBlock reads key value lines", () => {
	assert.deepEqual(parseBlock('profile: "Thorn Ironfist"\nregion: head'), {
		profile: "Thorn Ironfist",
		region: "head",
	});
	assert.deepEqual(parseBlock(""), {});
});

test("normalizeSettings drops malformed saved data instead of trusting it", () => {
	assert.deepEqual(normalizeSettings(null), { profiles: [], defaultProfile: "" });
	assert.deepEqual(normalizeSettings("junk"), { profiles: [], defaultProfile: "" });
	const good = makeProfile("character", "Thorn", []);
	const saved = normalizeSettings({
		profiles: [good, { id: 1 }, { ...good, states: [] }],
		defaultProfile: "thorn",
	});
	assert.equal(saved.profiles.length, 1);
	assert.equal(saved.defaultProfile, "thorn");
});

test("makeProfile gives each profile its own copy and a unique id", () => {
	const a = makeProfile("body", "Me", []);
	const b = makeProfile("body", "Me", [a]);
	assert.equal(b.id, "me-2");
	assert.notEqual(a.states, b.states);
	assert.equal(a.regions.length, 23);
});

test("getMap falls back to no map for an unknown key", () => {
	assert.equal(getMap("nonsense").label, "No map (chips only)");
	assert.equal(Object.keys(getMap("body").shapes).length, 16);
});
