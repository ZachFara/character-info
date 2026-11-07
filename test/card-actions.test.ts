import { test } from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./harness.ts";
import type { quickAddValue as quickAddValueFn } from "../src/card-actions.ts";

const { quickAddValue } = await loadModule<{ quickAddValue: typeof quickAddValueFn }>("src/card-actions.ts");

test("a quick add trims the text and leaves doing and fix items as typed", () => {
	assert.equal(quickAddValue("doing", "  Wall sits "), "Wall sits");
	assert.equal(quickAddValue("fix", "See a physio"), "See a physio");
	assert.equal(quickAddValue("doing", "   "), "");
});

test("a link is wrapped in double brackets unless it already is a wikilink", () => {
	assert.equal(quickAddValue("links", "Knee Rehab"), "[[Knee Rehab]]");
	assert.equal(quickAddValue("links", "[[Knee Rehab]]"), "[[Knee Rehab]]");
	assert.equal(quickAddValue("links", "  "), "");
});
