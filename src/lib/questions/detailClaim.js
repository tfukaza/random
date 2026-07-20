// Cross-check for the perception questions against `detail-claim`, the 1–7
// slider back in chapter 1 ("How would you rate your attention to detail?").
//
// The claim is cheap to make and both poles are flattering, which is exactly
// why people answer it honestly — and why a contradiction later is worth
// scoring. The illusions are the only questions in the quiz with a verifiable
// right answer about a small visual detail, so they are the natural place to
// collect on it.
//
// ONLY the meticulous end is armed. Someone who said 6 or 7 told us up front
// they work in broad strokes and might miss things; missing something is then
// consistent, not a contradiction, and penalising it would be punishing them
// for accuracy about themselves. The quiz only ever bills people for claims
// they failed to keep — same rule as memory-claim → recall-trap and
// honesty-claim → found-wallet.
import { latestResponse } from '$lib/questions/metrics.svelte.js';

// 1 and 2 both read as "I notice everything"; 3 is already hedged.
export const METICULOUS_MAX = 2;

/**
 * Add the contradiction penalty to a perception question's delta.
 *
 * A missing entry means the taker deep-linked past `detail-claim` and never
 * made the claim, so there is nothing to collect — return the delta untouched
 * rather than guessing. Same fallback discipline as the rest of the ledger.
 *
 * @param {Record<string, number>} delta — the option's own score
 * @param {boolean} wrong — did they miss the detail this question tests?
 * @returns {Record<string, number>}
 */
export function sharpenAgainstDetailClaim(delta, wrong) {
	if (!wrong) return delta;
	const v = latestResponse('detail-claim')?.value;
	if (typeof v !== 'number' || v > METICULOUS_MAX) return delta;
	// 1 is the more emphatic claim ("tunnel-visioned"), so it costs more to
	// have been wrong about it.
	const cost = v === 1 ? 3 : 2;
	return { ...delta, honesty: (delta.honesty ?? 0) - cost };
}
