// Serves the browser harness (decision 0015): the plugin running in Chrome over an in-memory vault.
// Usage: npm run harness [-- --port 8765]
// Rebuilds on every change to src/, test/ or styles.css, and the open page reloads itself.
import esbuild from "esbuild";
import { copyFileSync, mkdtempSync, watch, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const at = process.argv.indexOf("--port");
const port = at > 0 ? Number(process.argv[at + 1]) : 8765;
const out = mkdtempSync(join(tmpdir(), "character-info-harness-"));

writeFileSync(
	join(out, "index.html"),
	`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Character Info harness</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body class="theme-light">
<script type="module" src="/app.js"></script>
<script>new EventSource("/esbuild").addEventListener("change", () => location.reload());</script>
</body>
</html>
`,
);

const copyStyles = () => copyFileSync(join(root, "styles.css"), join(out, "styles.css"));
copyStyles();
watch(join(root, "styles.css"), copyStyles);

const ctx = await esbuild.context({
	entryPoints: { app: join(root, "test/browser-app.ts") },
	bundle: true,
	format: "esm",
	target: "es2022",
	sourcemap: "inline",
	outdir: out,
	logLevel: "info",
	alias: { obsidian: join(root, "test/browser-obsidian.ts") },
});
await ctx.watch();
const { port: served } = await ctx.serve({ servedir: out, port, host: "127.0.0.1" });
console.log(`Character Info harness: http://127.0.0.1:${String(served)}/`);
