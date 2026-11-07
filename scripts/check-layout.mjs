// Rejects any file outside the allowed layout. Part of `make check`.
// Lists tracked files plus untracked files that are not gitignored, so a stray
// file is caught before it is committed.
import { execFileSync } from "node:child_process";

const ALLOWED_ROOT_FILES = new Set([
	".dependency-cruiser.cjs",
	".gitignore",
	".prettierignore",
	".prettierrc.json",
	"AGENTS.md",
	"CLAUDE.md",
	"DESIGN.md",
	"LICENSE",
	"Makefile",
	"PROGRESS.md",
	"README.md",
	"commitlint.config.mjs",
	"esbuild.config.mjs",
	"eslint.config.mjs",
	"knip.json",
	"manifest.json",
	"package-lock.json",
	"package.json",
	"styles.css",
	"tsconfig.json",
	"version-bump.mjs",
	"versions.json",
]);

/** Allowed directories, each with the pattern its files must match. */
const ALLOWED_DIRS = [
	{ dir: ".github/", pattern: /^\.github\/(workflows\/[\w.-]+\.yml|pull_request_template\.md)$/ },
	{ dir: ".githooks/", pattern: /^\.githooks\/(pre-commit|commit-msg)$/ },
	{ dir: "docs/decisions/", pattern: /^docs\/decisions\/\d{4}-[a-z0-9-]+\.md$/ },
	{ dir: "docs/images/", pattern: /^docs\/images\/[a-z0-9-]+\.png$/ },
	{ dir: "scripts/", pattern: /^scripts\/[\w-]+\.(mjs|sh)$/ },
	{ dir: "src/", pattern: /^src\/[\w-]+\.ts$/ },
	{ dir: "test/", pattern: /^test\/[\w.-]+\.ts$/ },
];

const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
	encoding: "utf8",
});
const files = out.split("\n").filter(Boolean);

const bad = files.filter((f) => {
	if (!f.includes("/")) return !ALLOWED_ROOT_FILES.has(f);
	const rule = ALLOWED_DIRS.find((d) => f.startsWith(d.dir));
	return !rule || !rule.pattern.test(f);
});

if (bad.length > 0) {
	console.error("Layout check failed. These files are outside the allowed layout:");
	for (const f of bad) console.error(`  ${f}`);
	console.error("Throwaway files belong in .scratch/. New permanent locations need a decision record");
	console.error("and an edit to scripts/check-layout.mjs.");
	process.exit(1);
}
console.log(`Layout ok (${String(files.length)} files).`);
