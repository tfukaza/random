// The answers log — shared infrastructure for every question that scores
// against something the taker did earlier (the P2 "quiz validates you" pillar
// and the C3/C4 backlog in docs/design.md).
//
// Writers call logAnswer(id, entry) from their onPick/commit handlers; the
// entry shape is up to the writer (pick index, slider value, elapsed ms) but
// keep it small and primitive. Readers MUST handle a missing entry — a
// deep-link past the writer means no record, and the correct response is to
// skip the cross-check, never to guess.
export const ledger = $state({
	/** @type {Record<string, { index?: number, value?: number, label?: string }>} */
	answers: {}
});

/**
 * @param {string} id — question key, e.g. 'party', 'honesty-claim'
 * @param {{ index?: number, value?: number, label?: string }} entry
 */
export function logAnswer(id, entry) {
	ledger.answers[id] = entry;
}
