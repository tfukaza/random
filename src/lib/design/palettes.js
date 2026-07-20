// Single source of truth for the palettes offered in Q17 and reused when styling
// Q19 based on the Q17 answer. Each palette carries 4 swatch colors plus an
// explicit, hand-curated role mapping (background / text / accent) — curated
// rather than derived, so the tasteful palettes genuinely look designed (e.g.
// mono-orange themes as a dark retro sci-fi terminal) and the ugly ones clash
// exactly as intended. `text` may sit outside the 4 swatches when none of them
// has enough contrast against the background to stay legible.
export const PALETTES = [
	{
		id: 'neon',
		label: 'Neon',
		colors: ['#ff2ad4', '#00e5ff', '#a6ff00', '#8b00ff'],
		roles: { bg: '#8b00ff', text: '#a6ff00', accent: '#ff2ad4' }
	},
	{
		id: 'ugly-pg',
		label: 'Purple / green clash',
		colors: ['#7a2f9e', '#8fb63a', '#4e6b1f', '#c77dd6'],
		roles: { bg: '#8fb63a', text: '#7a2f9e', accent: '#c77dd6' }
	},
	{
		id: 'ugly-mmt',
		label: 'Mustard / maroon / teal',
		colors: ['#b0a029', '#7d2b3f', '#2f8f86', '#c56b2c'],
		roles: { bg: '#b0a029', text: '#7d2b3f', accent: '#2f8f86' }
	},
	{
		id: 'pastel-blue',
		label: 'Pastel blue',
		colors: ['#d6e6f2', '#bcd4e6', '#a1c3d8', '#c9e0ee'],
		roles: { bg: '#d6e6f2', text: '#33475b', accent: '#a1c3d8' }
	},
	{
		// This quiz's own tokens, lifted verbatim from app.css: --bg, --surface,
		// --rule, --ink. Picking it designs an exact copy of the page it is
		// printed on. The label is never rendered (palette-taste shows swatches
		// only), so it does not give the game away.
		id: 'paper',
		label: 'Warm grey / ink',
		colors: ['#e2e2e0', '#fcfcfb', '#c3c3c1', '#222220'],
		roles: { bg: '#e2e2e0', text: '#222220', accent: '#222220' }
	},
	{
		id: 'mono-orange',
		label: 'Mono + orange',
		colors: ['#f7f9fb', '#93a1ad', '#0f141b', '#ff6a1a'],
		// Clean light theme: white background, black text, bright orange accent
		// (renders as orange buttons with white text).
		roles: { bg: '#ffffff', text: '#0f141b', accent: '#ff6a1a' }
	},
	{
		id: 'earthy',
		label: 'Earthy autumnal',
		colors: ['#9c5b34', '#c67b3e', '#d8a24a', '#7f8447'],
		roles: { bg: '#d8a24a', text: '#3f2a14', accent: '#7f8447' }
	}
];

/** @param {string} hex */
function toRgb(hex) {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance (0 = black, 1 = white). @param {string} hex */
function luminance(hex) {
	const [r, g, b] = toRgb(hex).map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick black or white for legibility on a given background. @param {string} hex */
export function readableOn(hex) {
	return luminance(hex) > 0.45 ? '#111111' : '#ffffff';
}
