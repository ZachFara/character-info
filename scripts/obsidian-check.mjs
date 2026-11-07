// Runs the plugin in a real Obsidian and checks the main features. Not part of `make check`,
// because CI has no Obsidian. Usage: make obsidian-check, or node scripts/obsidian-check.mjs --readme
// to also refresh the README pictures in docs/images/.
//
// It builds the plugin, makes a throwaway vault and a throwaway Obsidian profile in a temp
// folder, starts a separate Obsidian with a debugging port, drives it, writes screenshots to
// .scratch/obsidian-check/, and closes that Obsidian again. The owner's own Obsidian and vaults
// are never touched. Set OBSIDIAN_BIN to use an Obsidian somewhere other than /Applications.
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BIN = process.env.OBSIDIAN_BIN ?? "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
const PORT = 9400 + Math.floor(Math.random() * 400);
const OUT = join(ROOT, ".scratch", "obsidian-check");
/** With --readme, also saves cropped pictures of the plugin to docs/images/ for the README. */
const README = process.argv.includes("--readme");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NOTES = {
	"Body.md": "```character-info\nprofile: Me\ntemplate: body\n```\n",
	"Thorn.md": "```character-info\nprofile: Thorn\ntemplate: character\nadd: Tail\n```\n",
	"Ruiz.md": "```character-info\nprofile: Ruiz\ntemplate: character\n```\n",
	"Party.md": "```character-party\ntitle: The Company\nall\n```\n",
	"Character Info/Me.md":
		"---\nregions:\n  hips:\n    status: hurt\n    note: Sore after a long run.\n    fix: [Rest a week, See a physio]\n  neck:\n    status: watch\n  gut:\n    status: watch\n  knees:\n    status: watch\n  head:\n    status: ok\n  skin:\n    status: ok\n  feet:\n    status: hurt\n---\n",
	"Character Info/Thorn.md":
		"---\nregions:\n  armL:\n    status: wounded\n    note: Crossbow bolt.\n  legR:\n    status: bruised\ninventory:\n  - name: Gravethorn helm\n    kind: armor\n    look: gravethorn:helm\n  - name: Gravethorn chest\n    kind: armor\n    look: gravethorn:chest\n  - name: Gravethorn pauldrons\n    kind: armor\n    look: gravethorn:pauldrons\n  - name: Gravethorn gauntletR\n    kind: armor\n    look: gravethorn:gauntletR\n  - name: Gravethorn gauntletL\n    kind: armor\n    look: gravethorn:gauntletL\n  - name: Gravethorn greaveR\n    kind: armor\n    look: gravethorn:greaveR\n  - name: Gravethorn greaveL\n    kind: armor\n    look: gravethorn:greaveL\n  - name: Gravethorn boots\n    kind: armor\n    look: gravethorn:boots\n---\n",
	"Character Info/Ruiz.md":
		"---\nregions:\n  head:\n    status: bruised\ninventory:\n  - name: Military helm\n    kind: armor\n    look: military:helm\n  - name: Military chest\n    kind: armor\n    look: military:chest\n  - name: Military gauntletR\n    kind: armor\n    look: military:gauntletR\n  - name: Military gauntletL\n    kind: armor\n    look: military:gauntletL\n  - name: Military greaveR\n    kind: armor\n    look: military:greaveR\n  - name: Military greaveL\n    kind: armor\n    look: military:greaveL\n  - name: Military boots\n    kind: armor\n    look: military:boots\n---\n",
};

/** A fresh vault with the built plugin and sample notes, and a profile that opens only it. */
function stage() {
	const base = mkdtempSync(join(tmpdir(), "character-info-check-"));
	const vault = join(base, "vault");
	mkdirSync(join(vault, ".obsidian"), { recursive: true });
	mkdirSync(join(vault, "Character Info"), { recursive: true });
	for (const [path, text] of Object.entries(NOTES)) writeFileSync(join(vault, path), text);
	const profile = join(base, "profile");
	mkdirSync(profile);
	const vaults = { checkvault0000001: { path: vault, ts: Date.now(), open: true } };
	writeFileSync(join(profile, "obsidian.json"), JSON.stringify({ vaults }));
	return { base, profile, vault };
}

/**
 * Copies the built plugin into the vault once Obsidian is running. A vault that already has plugins
 * when it is first opened makes Obsidian ask whether to trust its author, which would block the run.
 */
function installPlugin(vault) {
	const plugin = join(vault, ".obsidian", "plugins", "character-info");
	mkdirSync(plugin, { recursive: true });
	for (const f of ["main.js", "manifest.json", "styles.css"]) copyFileSync(join(ROOT, f), join(plugin, f));
	writeFileSync(join(plugin, "data.json"), JSON.stringify({ features: { inventory: true } }));
}

/** Reads JSON over plain HTTP from the debugging port. */
function getJson(url) {
	return new Promise((resolveJson, reject) => {
		get(url, (res) => {
			let body = "";
			res.on("data", (chunk) => (body += chunk));
			res.on("end", () => {
				try {
					resolveJson(JSON.parse(body));
				} catch (err) {
					reject(err);
				}
			});
		}).on("error", reject);
	});
}

/** A tiny client for the Chrome DevTools protocol on the throwaway Obsidian. */
async function connect() {
	for (let i = 0; i < 60; i++) {
		try {
			const targets = await getJson(`http://127.0.0.1:${String(PORT)}/json`);
			const page = targets.find((t) => t.type === "page" && t.url.startsWith("app://"));
			if (page) return open(page.webSocketDebuggerUrl);
		} catch {
			// Obsidian is still starting.
		}
		await sleep(500);
	}
	throw new Error("Obsidian did not open a debugging port.");
}

async function open(url) {
	const ws = new WebSocket(url);
	await new Promise((r) => (ws.onopen = r));
	let id = 0;
	const pending = new Map();
	ws.onmessage = (m) => {
		const d = JSON.parse(m.data);
		pending.get(d.id)?.(d);
		pending.delete(d.id);
	};
	const send = (method, params = {}) =>
		new Promise((r) => {
			pending.set(++id, r);
			ws.send(JSON.stringify({ id, method, params }));
		});
	const run = async (expression) => {
		const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
		if (r.result?.exceptionDetails)
			throw new Error(r.result.exceptionDetails.exception?.description ?? "script failed");
		return r.result?.result?.value;
	};
	const shot = async (path, clip) => {
		const r = await send("Page.captureScreenshot", {
			format: "png",
			...(clip ? { clip: { ...clip, scale: 1 } } : {}),
		});
		writeFileSync(path, Buffer.from(r.result.data, "base64"));
	};
	/** A fixed, tall viewport so pictures are the same size on every machine. */
	const emulate = () =>
		send("Emulation.setDeviceMetricsOverride", {
			width: 1400,
			height: 1500,
			deviceScaleFactor: 2,
			mobile: false,
		});
	return { run, shot, emulate, close: () => ws.close() };
}

// Each check opens a note and returns facts read from the visible block.
const PRELUDE = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0);
const openNote = async (n) => { await app.workspace.openLinkText(n, "", false); await sleep(1500); };
const rect = async (top, bottom = top) => { vis(top)[0].scrollIntoView({ block: "start" }); await sleep(300);
  const a = vis(top)[0].getBoundingClientRect(); const b = vis(bottom)[0].getBoundingClientRect();
  return { x: a.x - 8, y: Math.max(0, a.y - 8), width: a.width + 16, height: b.bottom - a.y + 16 }; };`;

const CHECKS = [
	{
		name: "body",
		readme: "body",
		script: `await openNote("Body"); return { regions: vis(".ci-region").length, selected: vis(".ci-name")[0]?.textContent, clip: await rect(".character-info", ".ci-grid") };`,
		expect: (r) => r.regions === 16 && r.selected === "Hips & Low Back",
	},
	{
		name: "character",
		script: `await openNote("Thorn"); return { chips: vis(".ci-chip").length, toggle: vis(".ci-viewtoggle button").length };`,
		expect: (r) => r.chips === 8 && r.toggle === 2,
	},
	{
		name: "armor",
		readme: "armor",
		script: `await openNote("Thorn"); vis(".ci-viewtoggle button").find((b) => b.textContent === "Armor").click(); await sleep(400);
return { pieces: vis(".ci-armor > *").length, clip: await rect(".character-info", ".ci-grid") };`,
		expect: (r) => r.pieces > 8,
	},
	{
		name: "soldier",
		script: `await openNote("Ruiz"); return { toggle: vis(".ci-viewtoggle button").length };`,
		expect: (r) => r.toggle === 2,
	},
	{
		name: "reviews-off",
		script: `const plugin = app.plugins.plugins["character-info"]; const before = vis(".ci-due-count").length;
plugin.settings.features.reviews = false; await plugin.saveData(plugin.settings); plugin.notifyRegistry(); await openNote("Body");
const after = { count: vis(".ci-due-count").length, rings: vis(".ci-chip.is-due").length, card: vis(".ci-review").length };
plugin.settings.features.reviews = true; await plugin.saveData(plugin.settings); plugin.notifyRegistry();
return { before, ...after };`,
		expect: (r) => r.count === 0 && r.rings === 0 && r.card === 0,
	},
	{
		name: "party",
		readme: "party",
		script: `await openNote("Party"); return { tiles: vis(".ci-tile").map((t) => t.querySelector(".ci-tile-name")?.textContent), clip: await rect(".ci-party") };`,
		expect: (r) => ["Me", "Thorn", "Ruiz"].every((n) => r.tiles.includes(n)),
	},
];

async function main() {
	execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "ignore" });
	rmSync(OUT, { recursive: true, force: true });
	mkdirSync(OUT, { recursive: true });
	const { base, profile, vault } = stage();
	const app = spawn(BIN, [`--user-data-dir=${profile}`, `--remote-debugging-port=${String(PORT)}`], {
		stdio: "ignore",
	});
	let failed = 0;
	try {
		const cdp = await connect();
		await cdp.emulate();
		await sleep(2000);
		installPlugin(vault);
		const enabled = await cdp.run(`(async () => {
			await app.plugins.loadManifests();
			await app.plugins.setEnable(true);
			await app.plugins.enablePlugin("character-info");
			// enablePlugin loads the plugin without adding it to the saved list, so check it is loaded.
			return Boolean(app.plugins.plugins["character-info"]);
		})()`);
		if (!enabled) throw new Error("The plugin did not switch on in the throwaway Obsidian.");
		for (const check of CHECKS) {
			const { clip, ...result } = await cdp.run(`(async () => { ${PRELUDE}\n${check.script} })()`);
			await cdp.shot(join(OUT, `${check.name}.png`));
			if (README && check.readme) await cdp.shot(join(ROOT, "docs", "images", `${check.readme}.png`), clip);
			const ok = check.expect(result);
			if (!ok) failed++;
			console.log(`${ok ? "ok  " : "FAIL"} ${check.name} ${JSON.stringify(result)}`);
		}
		cdp.close();
	} finally {
		const exited = new Promise((r) => app.once("exit", r));
		app.kill();
		await Promise.race([exited, sleep(5000)]);
		// Obsidian can still be flushing its profile for a moment after it exits.
		rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
	}
	console.log(`Screenshots in ${OUT}`);
	if (failed) process.exit(1);
}

await main();
