// Cross-question state: the ids of items packed into the box in pack-box, read
// by airport-discard (throw one away). pack-box overwrites it on every commit,
// so a replay resets it naturally. Deep-linking straight to airport-discard
// finds it empty — that question handles it with a "nothing to throw away"
// fallback (debug-only concern).
export const box = $state({
	/** @type {string[]} */
	items: []
});
