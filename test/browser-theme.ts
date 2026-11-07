// Obsidian's default theme variables, light and dark, plus the harness shell's own layout. The
// plugin's styles.css is linked by the page, so it sees the same variables it gets in Obsidian.
const VARS = `
body {
	--size-4-1: 4px; --size-4-2: 8px; --size-4-3: 12px; --size-4-4: 16px; --size-4-5: 20px;
	--radius-s: 4px; --radius-m: 8px; --radius-l: 12px;
	--font-ui-smaller: 12px; --font-ui-small: 13px; --font-ui-medium: 15px; --font-ui-large: 20px;
	--font-semibold: 600; --font-bold: 700;
	--font-interface: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
}
body.theme-light {
	--background-primary: #ffffff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e0e0e0; --background-modifier-border-hover: #d4d4d4;
	--background-modifier-hover: rgba(0, 0, 0, 0.067);
	--text-normal: #222222; --text-muted: #5c5c5c; --text-faint: #ababab; --text-warning: #c87a00;
	--text-error: #e93147; --interactive-accent: #8a5cf5; --interactive-normal: #ffffff;
	--text-on-accent: #ffffff; --text-accent: #8a5cf5; color-scheme: light;
}
body.theme-dark {
	--background-primary: #1e1e1e; --background-secondary: #262626;
	--background-modifier-border: #363636; --background-modifier-border-hover: #474747;
	--background-modifier-hover: rgba(255, 255, 255, 0.075);
	--text-normal: #dadada; --text-muted: #b3b3b3; --text-faint: #666666; --text-warning: #e0a000;
	--text-error: #fb464c; --interactive-accent: #7f6df2; --interactive-normal: #363636;
	--text-on-accent: #ffffff; --text-accent: #a68af9; color-scheme: dark;
}`;

const SHELL = `
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-interface); background: var(--background-secondary);
	color: var(--text-normal); font-size: 15px; }
button, select, input, textarea { font: inherit; color: inherit; }
button, select { background: var(--interactive-normal); border: 1px solid var(--background-modifier-border);
	border-radius: var(--radius-s); padding: 4px 10px; cursor: pointer; }
button.mod-cta { background: var(--interactive-accent); color: var(--text-on-accent); border-color: transparent; }
button.mod-warning { color: var(--text-error); }
input[type=text], textarea { background: var(--background-primary); border: 1px solid var(--background-modifier-border);
	border-radius: var(--radius-s); padding: 4px 8px; }
.hx-bar { display: flex; gap: 8px; align-items: center; padding: 8px 12px; flex-wrap: wrap;
	border-bottom: 1px solid var(--background-modifier-border); }
.hx-bar .hx-title { font-weight: 600; margin-right: auto; }
.hx-main { display: flex; min-height: calc(100vh - 50px); }
.hx-files { width: 210px; padding: 8px; border-right: 1px solid var(--background-modifier-border); flex-shrink: 0; }
.hx-files .hx-folder { font-size: 12px; color: var(--text-muted); margin: 10px 6px 2px; }
.hx-files button { display: block; width: 100%; text-align: left; border: none; background: none;
	padding: 3px 8px; border-radius: var(--radius-s); }
.hx-files button.is-active { background: var(--background-modifier-hover); font-weight: 600; }
.hx-pane { flex: 1; display: flex; justify-content: center; padding: 16px; overflow: auto; }
.hx-leaf { width: 100%; max-width: 900px; background: var(--background-primary);
	border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); padding: 16px 28px; }
.hx-phone-frame { display: block; width: 390px; height: calc(100vh - 80px); margin: 12px auto;
	border: 1px solid var(--background-modifier-border); border-radius: 18px; background: var(--background-primary); }
body.hx-framed .hx-bar, body.hx-framed .hx-files { display: none; }
body.hx-framed .hx-pane { padding: 0; }
body.hx-framed .hx-leaf { border: none; border-radius: 0; padding: 12px; }
.hx-path { font-size: 12px; color: var(--text-faint); }
.hx-props { font-size: 12px; color: var(--text-muted); margin: 8px 0; }
.hx-props pre { background: var(--background-secondary); padding: 8px; border-radius: var(--radius-s); overflow: auto; }
.hx-source { width: 100%; min-height: 70vh; font-family: ui-monospace, monospace; font-size: 13px; }
.markdown-rendered pre { background: var(--background-secondary); padding: 8px; border-radius: var(--radius-s); }
.internal-link { color: var(--text-accent); text-decoration: none; }
.internal-link.is-unresolved { opacity: 0.7; text-decoration: underline dotted; }
.modal-container { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 30; }
.modal-bg { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5); }
.modal { position: relative; background: var(--background-primary); border: 1px solid var(--background-modifier-border);
	border-radius: var(--radius-l); padding: 20px; width: min(640px, 94vw); max-height: 85vh; overflow: auto; }
.modal-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.modal-close-button { position: absolute; right: 10px; top: 8px; border: none; background: none; font-size: 20px; }
.setting-item { display: flex; gap: 12px; align-items: center; padding: 10px 0;
	border-top: 1px solid var(--background-modifier-border); }
.setting-item-info { flex: 1; }
.setting-item-description { font-size: 13px; color: var(--text-muted); }
.setting-item-heading .setting-item-name { font-weight: 600; font-size: 16px; }
.setting-item-control { display: flex; gap: 6px; align-items: center; }
.checkbox-container { width: 40px; height: 22px; border-radius: 11px; background: var(--background-modifier-border);
	position: relative; cursor: pointer; }
.checkbox-container::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
	border-radius: 50%; background: #fff; transition: left 0.1s; }
.checkbox-container.is-enabled { background: var(--interactive-accent); }
.checkbox-container.is-enabled::after { left: 21px; }
.notice-container { position: fixed; top: 60px; right: 16px; z-index: 40; display: flex; flex-direction: column; gap: 8px; }
.notice { background: var(--background-primary); border: 1px solid var(--background-modifier-border);
	border-radius: var(--radius-m); padding: 10px 14px; max-width: 320px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.suggestion-container { position: fixed; z-index: 50; background: var(--background-primary); min-width: 200px;
	border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); padding: 4px; }
.suggestion-item { padding: 4px 8px; border-radius: var(--radius-s); cursor: pointer; }
.suggestion-item.is-selected { background: var(--background-modifier-hover); }
.hx-commands button { display: block; width: 100%; text-align: left; margin: 4px 0; }`;

export function installTheme(): void {
	const sheet = new CSSStyleSheet();
	sheet.replaceSync(VARS + SHELL);
	activeDocument.adoptedStyleSheets = [...activeDocument.adoptedStyleSheets, sheet];
}
