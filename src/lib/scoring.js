// The seven signed temperament axes — the whole scoring system.
//
// (An earlier four-bucket scheme — adventurer/sage/maker/connector — was
// retired once the axes and the 128 types replaced it. Because mergeScores
// only adds keys already present in the total, any stale trait key left in a
// question is silently ignored rather than corrupting a tally.)
//
// Positive/negative pole meanings are fixed here and nowhere else; a value of
// 0 collapses to the positive pole when typing (honesty: innocent until
// proven lying). See docs/design.md.
export const AXES = [
	{ id: 'social', negLabel: 'Introvert', posLabel: 'Extrovert', negEmoji: '🤫', posEmoji: '🎉' },
	{ id: 'honesty', negLabel: 'Dishonest', posLabel: 'Honest', negEmoji: '🤥', posEmoji: '😇' },
	{ id: 'creative', negLabel: 'Pragmatic', posLabel: 'Creative', negEmoji: '🔧', posEmoji: '🎨' },
	{ id: 'risk', negLabel: 'Cautious', posLabel: 'Risk-taker', negEmoji: '🛡️', posEmoji: '🎢' },
	{
		id: 'scope',
		negLabel: 'Detail-oriented',
		posLabel: 'Big-picture',
		negEmoji: '🔬',
		posEmoji: '🔭'
	},
	{ id: 'tempo', negLabel: 'Long & steady', posLabel: 'Quick-action', negEmoji: '🐢', posEmoji: '⚡' },
	{ id: 'coord', negLabel: 'Lone wolf', posLabel: 'Team-player', negEmoji: '🐺', posEmoji: '🤝' }
];

export const AXIS_IDS = AXES.map((a) => a.id);

/** A fresh score map with every axis at 0. */
export function emptyScores() {
	return Object.fromEntries(AXIS_IDS.map((id) => [id, 0]));
}

/**
 * Add a partial score delta (e.g. { social: 2, risk: -1 }) into a running
 * total, returning a new object. Unknown keys are ignored so questions can't
 * corrupt the tally.
 * @param {Record<string, number>} total
 * @param {Record<string, number>} [delta]
 * @returns {Record<string, number>}
 */
export function mergeScores(total, delta) {
	const next = { ...total };
	for (const [id, points] of Object.entries(delta ?? {})) {
		if (id in next) next[id] += points;
	}
	return next;
}

/**
 * The taker's position on each temperament axis — drives the result spectra,
 * the live HUD, and the 2^7 type key. `value` is the raw signed sum.
 * @param {Record<string, number>} total
 */
export function axisSummary(total) {
	return AXES.map((axis) => ({ ...axis, value: total[axis.id] ?? 0 }));
}
