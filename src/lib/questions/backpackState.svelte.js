// Cross-question state: the ids of items packed into the backpack in Q26,
// read by Q27 (give one away). Q26 overwrites it on every commit, so a
// replay resets it naturally. Deep-linking straight to Q27 finds it empty —
// Q27 handles that with a "nothing to give" fallback (debug-only concern).
export const pack = $state({
	/** @type {string[]} */
	items: []
});
