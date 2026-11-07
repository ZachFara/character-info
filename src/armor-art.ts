// Armor drawn on the figure. Pure data: SVG markup in the figure's own coordinates (the body and
// humanoid maps share them), so a piece lands on the right place on either map. Left-side pieces
// are the right-side drawing mirrored across the figure's centre line at x = 120.
//
// Names and looks are original (decision 0011). Gravethorn evokes black horned plate with an
// ember glow; it copies no specific design.

export type ArmorPiece =
	"boots" | "greaveR" | "greaveL" | "chest" | "gauntletR" | "gauntletL" | "pauldrons" | "helm";

/** Paint order: lower layers first, the helm last. */
const ORDER: ArmorPiece[] = [
	"boots",
	"greaveR",
	"greaveL",
	"chest",
	"gauntletR",
	"gauntletL",
	"pauldrons",
	"helm",
];

const mirror = (markup: string): string => `<g transform="matrix(-1 0 0 1 240 0)">${markup}</g>`;
const pair = (markup: string): string => markup + mirror(markup);

// Modern military: olive drab and coyote, matte black hardware.
const OD = "#5d6b3c";
const OD_DARK = "#3f4a28";
const OD_MID = "#4f5c33";
const COYOTE = "#9c8656";
const COYOTE_DARK = "#7a6842";
const HARDWARE = "#1f2124";
const RUBBER = "#3a3d42";

const MIL_GLOVE = `<rect x="60" y="226" width="24" height="8" rx="2" fill="${OD}"/><rect x="60" y="232" width="24" height="31" rx="9" fill="${HARDWARE}"/><rect x="63" y="238" width="18" height="7" rx="3" fill="${RUBBER}"/>`;
const MIL_KNEE = `<path d="M93 326 H121" stroke="${OD_DARK}" stroke-width="3"/><rect x="94" y="313" width="25" height="29" rx="9" fill="${HARDWARE}"/><rect x="97" y="317" width="19" height="21" rx="7" fill="${RUBBER}"/>`;
const MIL_BOOT = `<rect x="94" y="388" width="25" height="34" rx="5" fill="${COYOTE_DARK}"/><path d="M99 394 H114 M99 400 H114 M99 406 H114" stroke="${COYOTE}" stroke-width="1.4"/><rect x="92" y="420" width="29" height="8" rx="3" fill="#2b2620"/>`;

const MILITARY: Partial<Record<ArmorPiece, string>> = {
	helm:
		`<path d="M91 50 C90 24 103 9 120 9 C137 9 150 24 149 50 L145 53 C139 47 101 47 95 53 Z" fill="${OD}" stroke="${OD_DARK}" stroke-width="1.2"/>` +
		`<path d="M95 53 C101 47 139 47 145 53 L144 57 C138 52 102 52 96 57 Z" fill="${OD_DARK}"/>` +
		`<rect x="113" y="11" width="14" height="9" rx="2" fill="${HARDWARE}"/><rect x="117" y="15" width="6" height="8" rx="1" fill="${RUBBER}"/>` +
		`<rect x="90" y="33" width="5" height="13" rx="1.5" fill="${HARDWARE}"/><rect x="145" y="33" width="5" height="13" rx="1.5" fill="${HARDWARE}"/>` +
		`<rect x="128" y="22" width="9" height="5" rx="1" fill="${COYOTE}"/>` +
		`<path d="M97 56 L104 72 M143 56 L136 72" stroke="${HARDWARE}" stroke-width="1.6" fill="none"/>`,
	chest:
		`<rect x="101" y="90" width="9" height="28" rx="2" fill="${OD_DARK}"/><rect x="130" y="90" width="9" height="28" rx="2" fill="${OD_DARK}"/>` +
		`<path d="M97 112 Q97 105 104 105 L136 105 Q143 105 143 112 L145 172 Q145 179 138 179 L102 179 Q95 179 95 172 Z" fill="${OD}" stroke="${OD_DARK}" stroke-width="1.2"/>` +
		`<rect x="93" y="163" width="54" height="17" rx="3" fill="${OD_DARK}"/>` +
		`<rect x="110" y="112" width="20" height="7" rx="1.5" fill="${COYOTE}"/>` +
		`<path d="M101 127 H139 M101 133 H139" stroke="${OD_DARK}" stroke-width="1.4"/>` +
		[101, 114, 127]
			.map(
				(x) =>
					`<rect x="${String(x)}" y="139" width="12" height="23" rx="2" fill="${OD_MID}" stroke="${OD_DARK}" stroke-width="1"/><rect x="${String(x)}" y="139" width="12" height="6" rx="1.5" fill="${OD_DARK}"/>`,
			)
			.join(""),
	gauntletR: MIL_GLOVE,
	gauntletL: mirror(MIL_GLOVE),
	greaveR: MIL_KNEE,
	greaveL: mirror(MIL_KNEE),
	boots: pair(MIL_BOOT),
};

// Gravethorn: black steel, raised edges, ember light in the seams.
const STEEL = "#18181c";
const PLATE = "#2a2a31";
const EDGE = "#44444f";
const EMBER = "#ff5a1f";
const ember = (d: string, width = 1.3): string =>
	`<path class="ci-ember" d="${d}" stroke="${EMBER}" stroke-width="${String(width)}" fill="none" stroke-linejoin="round"/>`;
const steel = (d: string, fill = STEEL): string =>
	`<path d="${d}" fill="${fill}" stroke="${EDGE}" stroke-width="1.2" stroke-linejoin="round"/>`;

const GT_PAULDRON =
	steel("M58 118 C56 98 68 86 88 86 L104 94 L100 112 C88 104 72 108 60 122 Z") +
	steel("M66 99 L55 80 L75 92 Z", PLATE) +
	steel("M79 90 L75 69 L87 88 Z", PLATE) +
	steel("M91 87 L94 71 L98 91 Z", PLATE) +
	`<path d="M62 112 C66 100 76 94 90 94 L98 98" stroke="${EDGE}" stroke-width="1.2" fill="none"/>` +
	ember("M61 118 C70 110 84 106 99 110");
const GT_GAUNTLET =
	steel("M61 192 L87 192 L85 236 L63 236 Z") +
	steel("M62 197 L49 186 L66 192 Z", PLATE) +
	ember("M65 212 L74 217 L83 212") +
	steel("M61 236 L85 236 L85 254 L82 266 L79 256 L76 268 L73 256 L70 268 L67 256 L64 266 L61 254 Z", PLATE);
const GT_GREAVE =
	steel("M95 326 L119 326 L117 394 L97 394 Z") +
	steel("M94 318 L107 291 L120 318 L114 335 L100 335 Z", PLATE) +
	ember("M100 352 L107 358 L114 352") +
	ember("M101 372 L107 377 L113 372", 1.1);
const GT_BOOT =
	steel("M94 390 L120 390 L121 414 L127 424 L119 422 L114 429 L108 422 L102 429 L96 422 L93 414 Z") +
	ember("M97 404 L107 408 L117 404", 1.1);

const GRAVETHORN: Partial<Record<ArmorPiece, string>> = {
	helm:
		steel("M100 31 C86 27 74 17 70 9 C82 14 92 18 106 22 Z") +
		steel("M140 31 C154 27 166 17 170 9 C158 14 148 18 134 22 Z") +
		steel("M93 52 C91 26 104 11 120 11 C136 11 149 26 147 52 L143 70 L131 78 L109 78 L97 70 Z") +
		steel("M120 8 L124 19 L120 31 L116 19 Z", PLATE) +
		steel("M97 40 L120 46 L143 40 L141 47 L120 53 L99 47 Z", PLATE) +
		`<path class="ci-ember" d="M103 52 L117 56 L120 58 L123 56 L137 52 L135 56 L123 60 L120 62 L117 60 L105 56 Z" fill="${EMBER}"/>` +
		`<path d="M112 64 V74 M116 65 V76 M120 66 V77 M124 65 V76 M128 64 V74" stroke="${EDGE}" stroke-width="1.2"/>` +
		steel("M97 66 L89 75 L102 71 Z", PLATE) +
		steel("M143 66 L151 75 L138 71 Z", PLATE),
	chest:
		steel("M105 87 L135 87 L132 100 L108 100 Z", PLATE) +
		steel("M95 100 L120 96 L145 100 L147 132 L140 170 L132 200 L108 200 L100 170 L93 132 Z") +
		steel("M98 104 L117 101 L117 128 L100 132 Z", "#222228") +
		steel("M142 104 L123 101 L123 128 L140 132 Z", "#222228") +
		steel("M120 98 L124 130 L120 196 L116 130 Z", PLATE) +
		ember("M100 141 L108 145 L114 139 L120 147 L126 139 L132 145 L140 141") +
		ember("M102 159 L110 163 L116 157 L120 165 L124 157 L130 163 L138 159") +
		ember("M106 179 L113 183 L120 177 L127 183 L134 179") +
		steel("M100 196 L140 196 L146 214 L134 210 L120 218 L106 210 L94 214 Z", PLATE),
	pauldrons: pair(GT_PAULDRON),
	gauntletR: GT_GAUNTLET,
	gauntletL: mirror(GT_GAUNTLET),
	greaveR: GT_GREAVE,
	greaveL: mirror(GT_GREAVE),
	boots: pair(GT_BOOT),
};

export const ARMOR_SETS: Record<string, Partial<Record<ArmorPiece, string>>> = {
	military: MILITARY,
	gravethorn: GRAVETHORN,
};

/** Splits a look such as `gravethorn:helm` into its set and piece, or null when it is not one we draw. */
function parseLook(look: string): { markup: string; piece: ArmorPiece } | null {
	const [set, piece] = look.split(":");
	const known = ORDER.find((p) => p === piece);
	const markup = set !== undefined && known ? ARMOR_SETS[set]?.[known] : undefined;
	return known && markup ? { markup, piece: known } : null;
}

/** The markup for a list of looks, in paint order. Unknown looks are skipped. */
export function armorMarkup(looks: string[]): string[] {
	return looks
		.map(parseLook)
		.filter((l): l is { markup: string; piece: ArmorPiece } => l !== null)
		.sort((a, b) => ORDER.indexOf(a.piece) - ORDER.indexOf(b.piece))
		.map((l) => l.markup);
}

const SET_LABELS: Record<string, string> = { military: "Military", gravethorn: "Gravethorn" };
const PIECE_LABELS: Record<ArmorPiece, string> = {
	helm: "helmet",
	chest: "chest armor",
	pauldrons: "shoulder plates",
	gauntletR: "right glove or gauntlet",
	gauntletL: "left glove or gauntlet",
	greaveR: "right knee or greave",
	greaveL: "left knee or greave",
	boots: "boots",
};

/** Every drawing that can be picked for a piece of armor, as a value and a readable label. */
export const ARMOR_LOOKS: { value: string; label: string }[] = Object.entries(ARMOR_SETS).flatMap(
	([set, pieces]) =>
		ORDER.filter((p) => pieces[p] !== undefined).map((p) => ({
			value: `${set}:${p}`,
			label: `${SET_LABELS[set] ?? set} ${PIECE_LABELS[p]}`,
		})),
);
