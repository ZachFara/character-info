// Reads, creates and moves the notes that hold each profile's data.
import { TFile, normalizePath, type App } from "obsidian";
import { folderMoves, normalizeFolder } from "./data.ts";
import type { Frontmatter, PluginSettings, Profile } from "./types.ts";

/** The frontmatter of a profile's data note, or nothing when the note does not exist yet. */
export function frontmatterFor(app: App, profile: Profile): Frontmatter {
	const file = app.vault.getAbstractFileByPath(normalizePath(profile.dataPath));
	if (!(file instanceof TFile)) return {};
	const fm: Frontmatter | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
	return fm ?? {};
}

async function ensureFolder(app: App, folder: string): Promise<void> {
	if (folder && !app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
}

/** A profile's data note, created empty in its folder the first time it is needed. */
export async function ensureDataFile(app: App, profile: Profile): Promise<TFile> {
	const path = normalizePath(profile.dataPath);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) return existing;
	await ensureFolder(app, path.split("/").slice(0, -1).join("/"));
	return app.vault.create(path, `---\ncharacter-info-profile: ${profile.name}\nregions: {}\n---\n`);
}

/**
 * Sets the data folder and moves the data notes that were in the old one, updating links to them.
 * A note already at the new path is left alone. Resolves to how many notes could not move.
 */
export async function moveDataFolder(app: App, settings: PluginSettings, raw: string): Promise<number> {
	const folder = normalizeFolder(raw);
	const moves = folderMoves(settings.profiles, settings.dataFolder, folder);
	settings.dataFolder = folder;
	await ensureFolder(app, folder);
	let blocked = 0;
	for (const { profile, target } of moves) {
		if (app.vault.getAbstractFileByPath(target)) {
			blocked++;
			continue;
		}
		const file = app.vault.getAbstractFileByPath(normalizePath(profile.dataPath));
		if (file instanceof TFile) await app.fileManager.renameFile(file, target);
		profile.dataPath = target;
	}
	return blocked;
}
