import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdit, parseBlock, pickInitial, readRegion, resolveState, slug, tally, toList, uniqueId, isUnknownStatus } from "../src/data.js";
import { STATE_SETS, TEMPLATES } from "../src/presets.js";

const profile = { states: STATE_SETS.maintenance.states, defaultState: "unknown", regions: TEMPLATES.body.regions.slice(0, 4) };

test("slug and uniqueId", () => {
	assert.equal(slug("Hips & Low Back"), "hips-low-back");
	assert.equal(slug("!!!"), "item");
	assert.equal(uniqueId("Knee", ["knee", "knee-2"]), "knee-3");
});

test("toList accepts arrays, strings and nothing", () => {
	assert.deepEqual(toList([" a ", "", "b"]), ["a", "b"]);
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
	const fm = { regions: { head: { status: "ok" }, neck: { status: "hurt" } } };
	const t = tally(profile, fm);
	assert.equal(t.ok, 1);
	assert.equal(t.hurt, 1);
	assert.equal(t.unknown, 2);
});

test("pickInitial opens the worst bad region", () => {
	const fm = { regions: { head: { status: "watch" }, neck: { status: "hurt" } } };
	assert.equal(pickInitial(profile, fm), "neck");
	assert.equal(pickInitial(profile, {}), "head");
});

test("a status change appends history and an unchanged status does not", () => {
	const fm = {};
	applyEdit(fm, profile, "head", { status: "hurt" }, "2026-11-06");
	assert.deepEqual(fm.regions.head.history, [{ date: "2026-11-06", from: "unknown", to: "hurt" }]);
	applyEdit(fm, profile, "head", { status: "hurt", note: "ouch" }, "2026-11-07");
	assert.equal(fm.regions.head.history.length, 1);
	applyEdit(fm, profile, "head", { status: "ok" }, "2026-11-08");
	assert.equal(fm.regions.head.history.length, 2);
	assert.equal(readRegion(fm, "head").note, "ouch");
});

test("empty fields are removed from the stored region", () => {
	const fm = { regions: { head: { note: "x", doing: ["a"] } } };
	applyEdit(fm, profile, "head", { note: "  ", doing: "" });
	assert.equal("note" in fm.regions.head, false);
	assert.equal("doing" in fm.regions.head, false);
});

test("parseBlock reads key value lines", () => {
	assert.deepEqual(parseBlock('profile: "Thorn Ironfist"\nregion: head'), { profile: "Thorn Ironfist", region: "head" });
	assert.deepEqual(parseBlock(""), {});
});
