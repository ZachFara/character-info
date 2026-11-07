import { test } from "node:test";
import assert from "node:assert/strict";
import {
	applyEdit,
	daysBetween,
	isReviewDue,
	lastTouched,
	armorLooks,
	applyInventory,
	describeItem,
	isUnknownStatus,
	itemsOnRegion,
	normalizeSettings,
	parseBlock,
	pickInitial,
	readInventory,
	readRegion,
	resolveState,
	slug,
	summarizeProfile,
	tally,
	toList,
	uniqueId,
} from "../src/data.ts";
import { STATE_SETS, TEMPLATES, getMap, makeProfile } from "../src/presets.ts";
import type { Frontmatter, Item, Profile } from "../src/types.ts";

const profile: Profile = {
	id: "me",
	name: "Me",
	template: "body",
	map: "body",
	states: STATE_SETS.maintenance.states,
	defaultState: "unknown",
	regions: TEMPLATES.body.regions.slice(0, 4),
	dataPath: "Character Info/Me.md",
	reviewAfterDays: 30,
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
	assert.deepEqual(normalizeSettings(null), {
		profiles: [],
		defaultProfile: "",
		features: { inventory: false, reviews: true },
	});
	assert.deepEqual(normalizeSettings("junk"), {
		profiles: [],
		defaultProfile: "",
		features: { inventory: false, reviews: true },
	});
	const good = makeProfile("character", "Thorn", []);
	const saved = normalizeSettings({
		profiles: [good, { id: 1 }, { ...good, states: [] }],
		defaultProfile: "thorn",
	});
	assert.equal(saved.profiles.length, 1);
	assert.equal(saved.defaultProfile, "thorn");
});

test("profiles saved without a template get one from their map", () => {
	const old = (map: string): unknown => {
		const { template: _omit, ...rest } = makeProfile("blank", "X", []);
		return { ...rest, map };
	};
	const saved = normalizeSettings({ profiles: [old("body"), old("humanoid"), old("none")] });
	assert.deepEqual(
		saved.profiles.map((p) => p.template),
		["body", "character", "blank"],
	);
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

test("a summary counts the problem states in order and names the worst region", () => {
	const fm: Frontmatter = {
		regions: {
			head: { status: "watch" },
			neck: { status: "hurt" },
			knees: { status: "watch" },
			hips: { status: "ok" },
		},
	};
	const full: Profile = { ...profile, regions: TEMPLATES.body.regions };
	const s = summarizeProfile(full, fm);
	assert.deepEqual(
		s.problems.map((p) => [p.state.id, p.count]),
		[
			["ok", 1],
			["watch", 2],
			["hurt", 1],
		],
	);
	assert.ok(s.worst);
	assert.equal(s.worst.region.id, "neck");
	assert.equal(s.worst.state.id, "hurt");
});

test("a summary of an all-default profile has no problems and no worst region", () => {
	const s = summarizeProfile(profile, {});
	assert.deepEqual(s, { problems: [], worst: null });
});

test("the inventory flag defaults to off and only a true value turns it on", () => {
	assert.equal(normalizeSettings({}).features.inventory, false);
	assert.equal(normalizeSettings({ features: { inventory: "yes" } }).features.inventory, false);
	assert.equal(normalizeSettings({ features: { inventory: true } }).features.inventory, true);
});

test("review reminders default to on and only an explicit false turns them off", () => {
	assert.equal(normalizeSettings({}).features.reviews, true);
	assert.equal(normalizeSettings({ features: { reviews: "no" } }).features.reviews, true);
	assert.equal(normalizeSettings({ features: { reviews: false } }).features.reviews, false);
});

test("the inventory is read with defaults and junk entries dropped", () => {
	const fm: Frontmatter = {
		inventory: [
			{ name: "Sword", kind: "weapon", qty: 2, note: "Steel", region: "armR", look: null },
			{ name: "Rope" },
			{ name: "Odd", kind: "spell", qty: 0 },
			{ kind: "armor" },
			"junk",
		],
	};
	assert.deepEqual(readInventory(fm), [
		{ name: "Sword", kind: "weapon", qty: 2, note: "Steel", region: "armR", look: null },
		{ name: "Rope", kind: "gear", qty: 1, note: "", region: null, look: null },
		{ name: "Odd", kind: "gear", qty: 1, note: "", region: null, look: null },
	]);
	assert.deepEqual(readInventory({}), []);
	assert.deepEqual(readInventory({ inventory: "none" }), []);
});

test("writing the inventory leaves out empty fields and removes the key when empty", () => {
	const items: Item[] = [
		{ name: "Sword", kind: "weapon", qty: 1, note: "", region: null, look: null },
		{ name: "Water", kind: "gear", qty: 3, note: "1 L", region: "armL", look: null },
	];
	const fm: Frontmatter = { regions: {} };
	applyInventory(fm, items);
	assert.deepEqual(fm.inventory, [
		{ name: "Sword", kind: "weapon" },
		{ name: "Water", kind: "gear", qty: 3, note: "1 L", region: "armL" },
	]);
	assert.deepEqual(readInventory(fm), items);
	applyInventory(fm, []);
	assert.equal("inventory" in fm, false);
});

test("items on a region are those tied to it, and an item reads as one line", () => {
	const sword: Item = {
		name: "Longsword",
		kind: "weapon",
		qty: 1,
		note: "Steel",
		region: "armR",
		look: null,
	};
	const water: Item = { name: "Water", kind: "gear", qty: 3, note: "", region: null, look: null };
	const dagger: Item = { name: "Dagger", kind: "weapon", qty: 1, note: "", region: "armR", look: null };
	assert.deepEqual(itemsOnRegion([sword, water, dagger], "armR"), [sword, dagger]);
	assert.deepEqual(itemsOnRegion([sword, water], "head"), []);
	assert.equal(describeItem(sword), "Longsword · Steel");
	assert.equal(describeItem(water), "3× Water");
	assert.equal(describeItem(dagger), "Dagger");
});

test("an item's look is read and written, and only armor with a look is drawn", () => {
	const fm: Frontmatter = {
		inventory: [
			{ name: "Helm", kind: "armor", region: "head", look: "gravethorn:helm" },
			{ name: "Vest", kind: "armor" },
			{ name: "Blade", kind: "weapon", look: "gravethorn:helm" },
		],
	};
	const items = readInventory(fm);
	assert.equal(items[0]?.look, "gravethorn:helm");
	assert.equal(items[1]?.look, null);
	assert.deepEqual(armorLooks(items), ["gravethorn:helm"]);
	const out: Frontmatter = {};
	applyInventory(out, items);
	assert.deepEqual((out.inventory as unknown[])[0], {
		name: "Helm",
		kind: "armor",
		region: "head",
		look: "gravethorn:helm",
	});
	assert.deepEqual((out.inventory as unknown[])[1], { name: "Vest", kind: "armor" });
});

test("every save stamps the review date, including a save that only marks it reviewed", () => {
	const fm: Frontmatter = { regions: { head: { status: "hurt" } } };
	applyEdit(fm, profile, "head", { note: "x" }, "2026-11-06");
	assert.equal(readRegion(fm, "head").reviewed, "2026-11-06");
	applyEdit(fm, profile, "head", { reviewed: true }, "2026-12-01");
	assert.equal(readRegion(fm, "head").reviewed, "2026-12-01");
	assert.equal(readRegion(fm, "head").note, "x");
	assert.equal(readRegion({ regions: { head: { reviewed: "soon" } } }, "head").reviewed, null);
});

test("days between dates count whole days across months and years", () => {
	assert.equal(daysBetween("2026-11-06", "2026-11-06"), 0);
	assert.equal(daysBetween("2026-11-06", "2026-12-06"), 30);
	assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

test("the last touch is the later of the review date and the newest history entry", () => {
	const data = readRegion(
		{ regions: { a: { reviewed: "2026-10-01", history: [{ date: "2026-10-20", from: "ok", to: "hurt" }] } } },
		"a",
	);
	assert.equal(lastTouched(data), "2026-10-20");
	assert.equal(lastTouched(readRegion({}, "a")), null);
});

test("a review is due after more than the profile's days, never on the boundary day", () => {
	const fm: Frontmatter = { regions: { head: { status: "hurt", reviewed: "2026-10-01" } } };
	const data = readRegion(fm, "head");
	assert.equal(isReviewDue(profile, data, "2026-10-31"), false);
	assert.equal(isReviewDue(profile, data, "2026-11-01"), true);
});

test("a region in the default state is never due, and 0 days turns reviews off", () => {
	const untracked = readRegion({ regions: { head: { reviewed: "2020-01-01" } } }, "head");
	assert.equal(isReviewDue(profile, untracked, "2026-11-06"), false);
	const hurt = readRegion({ regions: { head: { status: "hurt" } } }, "head");
	assert.equal(isReviewDue(profile, hurt, "2026-11-06"), true);
	assert.equal(isReviewDue({ ...profile, reviewAfterDays: 0 }, hurt, "2026-11-06"), false);
});

test("older saved profiles get the default review period", () => {
	const { reviewAfterDays: _omit, ...old } = makeProfile("body", "Old", []);
	assert.equal(normalizeSettings({ profiles: [old] }).profiles[0]?.reviewAfterDays, 30);
});
