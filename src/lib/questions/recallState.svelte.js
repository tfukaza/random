// Written by Q39Recall, read by Q40Memory to decide how pointed its wording is.
//
// `correct` is null until Q39 has actually been answered — that covers deep-links
// straight to Q40, where the taker hasn't been caught out at anything and the
// question should stay neutral. Same fallback discipline as backpackState and
// patienceState.
export const recall = $state({
	/** @type {boolean | null} true only for a clean sweep; null = Q39 not answered yet */
	correct: null
});
