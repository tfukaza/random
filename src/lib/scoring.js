// The category buckets a quiz-taker can land in.
// Each question awards points to one or more of these ids; highest total wins.
export const CATEGORIES = [
	{
		id: 'adventurer',
		emoji: '🧭',
		title: 'The Adventurer',
		blurb:
			'You chase novelty and say yes before you overthink it. Comfort zones bore you; the unknown is where you feel most alive.'
	},
	{
		id: 'sage',
		emoji: '🦉',
		title: 'The Sage',
		blurb:
			'You want to understand how things really work. You sit with a problem until it clicks, and you trust reason over hype.'
	},
	{
		id: 'maker',
		emoji: '🛠️',
		title: 'The Maker',
		blurb:
			'You think with your hands. An idea only feels real once you have built, drawn, or shipped a version of it.'
	},
	{
		id: 'connector',
		emoji: '💞',
		title: 'The Connector',
		blurb:
			'People are your compass. You read a room instinctively and you are happiest making others feel seen and included.'
	}
];

/** The set of valid category ids, for quick lookups/validation. */
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/** A fresh score map with every category at 0. */
export function emptyScores() {
	return Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0]));
}

/**
 * Add a partial score delta (e.g. { adventurer: 2, sage: 1 }) into a running
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
 * Return the full category object with the highest score (ties → first defined).
 * @param {Record<string, number>} total
 */
export function topCategory(total) {
	let best = CATEGORIES[0];
	let bestScore = -Infinity;
	for (const cat of CATEGORIES) {
		const score = total[cat.id] ?? 0;
		if (score > bestScore) {
			best = cat;
			bestScore = score;
		}
	}
	return best;
}
