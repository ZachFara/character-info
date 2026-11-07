import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

/** Limits a shared config to some files, so it does not run on JSON or build scripts. */
const only = (configs, files) => configs.map((c) => ({ ...c, files }));

export default tseslint.config(
	{ ignores: ["main.js", "LICENSE", "node_modules/**", ".scratch/**", "coverage/**"] },
	...only(
		[js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
		["**/*.ts"],
	),
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: { ...globals.browser },
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		rules: {
			// Complexity limits. Split the function instead of raising a number.
			complexity: ["error", 10],
			"max-depth": ["error", 4],
			"max-params": ["error", 5],
			"max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
			"max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
			"no-console": ["error", { allow: ["error"] }],
			"@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
			"@typescript-eslint/consistent-type-imports": "error",
		},
	},
	{
		// node:test calls return promises that the runner tracks itself.
		files: ["test/**/*.ts"],
		rules: {
			"@typescript-eslint/no-floating-promises": [
				"error",
				{
					allowForKnownSafeCalls: [
						{ from: "package", package: "node:test", name: ["test", "describe", "it"] },
					],
				},
			],
		},
	},
	{
		// Decision 0005: the settings tab edits nested lists, which the declarative settings API
		// (Obsidian 1.13 and later) cannot express. Revisit when that API grows.
		files: ["src/settings.ts"],
		rules: { "obsidianmd/settings-tab/prefer-setting-definitions": "off" },
	},
	{
		// Build scripts are plain JavaScript run by Node.
		files: ["**/*.mjs", "**/*.cjs"],
		extends: [js.configs.recommended],
		languageOptions: { globals: { ...globals.node } },
	},
);
