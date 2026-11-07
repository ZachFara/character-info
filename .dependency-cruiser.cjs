// Module boundaries from DESIGN.md. The check fails on any violation.
//
//   types     leaf: imports nothing
//   data      pure logic: imports types only
//   presets   built-in data: imports types and data only
//   kits      starter kits and where they go: imports types only
//   armor-art  drawings of armor pieces: imports nothing
//   svg-map   reads an SVG file into a map, keeping only safe shapes: imports types, presets
//   profile-text  block text to profile: imports types, data, presets only
//   render    the figure and card: imports obsidian, data, presets, types
//   settings  the settings tab: imports obsidian, data, presets, types
//   new-profile  the new profile dialog: imports obsidian, presets, profile-text
//   party     several profiles side by side: imports obsidian, render, data, types
//   inventory-view  the inventory panel: imports data, types; only render imports it
//   card-actions  controls drawn on the card: imports types; only render imports it
//   main      the only module that wires the others together
const PURE = "^src/(types|data|presets|profile-text|kits|armor-art|svg-map)\\.ts$";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{ name: "no-circular", severity: "error", from: {}, to: { circular: true } },
		{
			name: "pure-modules-stay-pure",
			comment: "types, data and presets must not touch Obsidian or the UI modules.",
			severity: "error",
			from: { path: PURE },
			to: { path: ["^obsidian$", "^src/(render|settings|main)\\.ts$"], dependencyTypesNot: ["type-only"] },
		},
		{
			name: "pure-modules-no-obsidian-types",
			severity: "error",
			from: { path: PURE },
			to: { path: "^obsidian$" },
		},
		{
			name: "types-and-data-are-low-level",
			comment: "types imports nothing, and data imports types only.",
			severity: "error",
			from: { path: "^src/types\\.ts$" },
			to: { path: "^src/" },
		},
		{
			name: "data-imports-types-only",
			severity: "error",
			from: { path: "^src/data\\.ts$" },
			to: { path: "^src/(?!types\\.ts$)" },
		},
		{
			name: "ui-modules-do-not-import-each-other",
			severity: "error",
			from: { path: "^src/(render|settings|new-profile|inventory-view|card-actions)\\.ts$" },
			to: { path: "^src/(render|settings|new-profile|party|main)\\.ts$" },
		},
		{
			name: "src-does-not-import-tests",
			severity: "error",
			from: { path: "^src/" },
			to: { path: "^test/" },
		},
		{
			name: "no-orphans",
			severity: "error",
			from: { orphan: true, path: "^src/", pathNot: "^src/main\\.ts$" },
			to: {},
		},
	],
	options: {
		tsConfig: { fileName: "tsconfig.json" },
		tsPreCompilationDeps: true,
		doNotFollow: { path: "node_modules" },
		exclude: { path: "^node_modules" },
	},
};
