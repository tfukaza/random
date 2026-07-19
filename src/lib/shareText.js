// The shareable verdict — a Wordle-style block of text the taker can paste
// anywhere. Two design constraints, both borrowed from Wordle:
//
//   1. It has to survive plain text. No markup, no links, no HTML — just
//      characters, so it looks the same in a DM as in a tweet.
//   2. It has to be legible in a PROPORTIONAL font. Nothing here relies on
//      monospace alignment: every row is the same character count with the
//      same emoji budget (two), so the bars line up in practice even where
//      column-aligned labels would not.
//
// Tone note (docs/design.md P6): this is the instrument reporting a finding,
// not the quiz being pleased with itself. No "I got…", no exclamation marks.

/** Cells either side of the centre line. */
const CELLS = 5;

/**
 * Force emoji presentation and a uniform code-point count.
 *
 * The axis emoji are inconsistent as authored: 🛡️ already carries a
 * variation selector (U+FE0F) while 🤫 does not, so rows came out different
 * lengths — and ⚡ (U+26A1) lives in a symbols block that some platforms
 * render as a narrow monochrome glyph, which visibly breaks the column.
 * Stripping any existing selector and appending exactly one fixes both: every
 * emoji becomes two code points and every one renders emoji-style.
 * @param {string} emoji
 */
const wide = (emoji) => emoji.replace(/️/g, '') + '️';

/**
 * @param {{ code: string, plant: { common: string, scientific: string } }} persona
 * @param {Array<{ value: number, negEmoji: string, posEmoji: string }>} axes
 * @returns {string}
 */
export function buildShareText(persona, axes) {
	// Same shared scale as the result spectra, so the printed bars match the
	// ones the taker just looked at.
	const max = Math.max(4, ...axes.map((a) => Math.abs(a.value)));

	const rows = axes.map((axis) => {
		const filled = Math.min(CELLS, Math.round((Math.abs(axis.value) / max) * CELLS));
		// Magnitude grows outward from the centre line in both directions.
		const left =
			axis.value < 0 ? '░'.repeat(CELLS - filled) + '█'.repeat(filled) : '░'.repeat(CELLS);
		const right =
			axis.value > 0 ? '█'.repeat(filled) + '░'.repeat(CELLS - filled) : '░'.repeat(CELLS);
		const sign = axis.value > 0 ? '+' : axis.value < 0 ? '−' : '±';
		return `${wide(axis.negEmoji)}${left}│${right}${wide(axis.posEmoji)} ${sign}${Math.abs(axis.value)}`;
	});

	return [
		'What kind of person are you?',
		'',
		`Type ${persona.code}`,
		`${persona.plant.common} — ${persona.plant.scientific}`,
		'',
		...rows
	].join('\n');
}
