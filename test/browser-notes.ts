// The notes the browser harness starts with. Every profile and all data here is made up.
const fence = "```";

export const SEED_NOTES: Record<string, string> = {
	"Welcome.md": `# Welcome

This is the Character Info browser harness. The real plugin runs here over an in-memory vault.

- [[Thorn Ironfist]] is a tabletop character with wounds, notes and an inventory.
- [[Mira]] customises her template: added, removed and renamed regions.
- [[Body]] tracks a made-up person's maintenance on the 23-region body.
- [[Party]] shows several profiles side by side.
- [[Car]] is a blank list of parts.
- [[Sea Wolf]] is a ship drawn from your own SVG file.
- [[Wizard]] names a template that does not exist.
- [[Stranger]] refers to a profile nobody has defined yet.

Use Commands to insert new blocks, Settings for the plugin's settings tab, and Source to edit a note's text.`,

	"Thorn Ironfist.md": `# Thorn Ironfist

Dwarf fighter, level 5. Lost an argument with an ogre.

${fence}character-info
profile: Thorn
template: character
${fence}
`,

	"Mira.md": `# Mira

${fence}character-info
profile: Mira
template: character
add: Tail, Familiar
remove: Torso
rename: Left arm = Sword arm
${fence}
`,

	"Body.md": `# Body

${fence}character-info
profile: Sam
template: body
${fence}
`,

	"Party.md": `# Party

${fence}character-party
title: The Company
all
${fence}

${fence}character-party
title: Night watch
Thorn, Mira, Ghoul
${fence}
`,

	"Car.md": `# Car

${fence}character-info
profile: Civic
template: blank
add: Engine, Brakes, Tyres, Battery
${fence}
`,

	"Sea Wolf.md": `# Sea Wolf

A ship drawn as a custom SVG map. Edit Maps/ship.svg in Source mode and the map reloads.

${fence}character-info
profile: Sea Wolf
map: Maps/ship.svg
states: Sound, Worn, Damaged, Broken
${fence}
`,

	"Maps/ship.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">
  <path id="hull" data-name="Hull" d="M20 90 L180 90 L160 125 L40 125 Z"/>
  <rect id="main_sail" x="95" y="20" width="40" height="60"/>
  <polygon id="jib" points="90,25 90,80 55,80"><title>Jib</title></polygon>
  <rect id="rudder" x="22" y="95" width="10" height="25"/>
  <script>alert("dropped by the sanitizer")</script>
</svg>
`,

	"Wizard.md": `# Wizard

${fence}character-info
profile: Oops
template: wizard
${fence}
`,

	"Stranger.md": `# Stranger

${fence}character-info
profile: Stranger
${fence}
`,

	"Knee Rehab.md": `# Knee Rehab

- Wall sits, 3 x 45 s
- Step downs`,

	"Character Info/Thorn.md": `---
character-info-profile: Thorn
regions:
  armL:
    status: lost
    note: Taken off at the elbow by the ogre in session 4.
    history:
      - { date: 2026-10-12, from: healthy, to: lost }
  legR:
    status: wounded
    note: Crossbow bolt, 8 damage. Limping, half speed.
    fix: [Find a healer]
  head:
    status: bruised
    note: Concussed. Disadvantage on Perception until a long rest.
    links: ["[[Mira]]"]
    doing: [Rest until the next session]
inventory:
  - { name: Longsword, kind: weapon, note: Double-edged steel, region: armR }
  - { name: Kite shield, kind: armor, note: Painted with a red gauntlet, region: armL }
  - { name: Rations, kind: gear, qty: 3 }
---
`,

	"Character Info/Mira.md": `---
character-info-profile: Mira
regions:
  legL:
    status: wounded
    note: Twisted ankle on the stairs.
  head:
    status: bruised
---
`,

	"Character Info/Sam.md": `---
character-info-profile: Sam
regions:
  knees:
    status: watch
    note: Clicks on stairs. Trying [[Knee Rehab]].
    doing: [Wall sits]
    fix: [See a physio]
    history:
      - { date: 2026-10-20, from: unknown, to: watch }
  sleep:
    status: ok
    doing: [Lights out by 11]
---
`,
};
