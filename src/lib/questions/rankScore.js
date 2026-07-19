// Shared scoring for rank-order questions: an item's score delta counts for
// more the higher it was ranked, and last place counts for nothing. Extracted
// because more ranking questions are planned and they all want this same
// weighting — see `RankList.svelte`.

/**
 * @param {Array<{ id: string, score: Record<string, number> }>} source
 *   the question's items, each carrying its own score delta
 * @param {Array<{ id: string }>} ordered the taker's final order, best first
 * @returns {Record<string, number>}
 */
export function weightByRank(source, ordered) {
	/** @type {Record<string, number>} */
	const total = {};
	ordered.forEach((it, i) => {
		const weight = ordered.length - 1 - i;
		if (weight === 0) return;
		const src = source.find((x) => x.id === it.id);
		if (!src) return;
		for (const [k, v] of Object.entries(src.score)) total[k] = (total[k] ?? 0) + v * weight;
	});
	return total;
}
