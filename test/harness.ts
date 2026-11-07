// Loads a source module with `obsidian` pointed at the stub, under jsdom, so UI code can be tested.
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomHelpers } from "./obsidian-stub.ts";

let ready = false;

function installDom(): void {
	if (ready) return;
	const dom = new JSDOM("<!doctype html><body></body>");
	Object.assign(globalThis, {
		window: dom.window,
		document: dom.window.document,
		activeDocument: dom.window.document,
		DOMParser: dom.window.DOMParser,
	});
	installDomHelpers(dom.window as unknown as Window & typeof globalThis);
	ready = true;
}

/** Bundles `entry` (a path from the repo root, such as src/render.ts) and returns its exports. */
export async function loadModule<T>(entry: string): Promise<T> {
	const out = join(mkdtempSync(join(tmpdir(), "character-info-")), "bundle.cjs");
	await build({
		entryPoints: [entry],
		bundle: true,
		format: "cjs",
		outfile: out,
		logLevel: "silent",
		alias: { obsidian: new URL("./obsidian-stub.ts", import.meta.url).pathname },
	});
	installDom();
	return createRequire(import.meta.url)(out) as T;
}
