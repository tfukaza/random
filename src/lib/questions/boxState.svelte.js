// Cross-question state: the ids of items packed into the box in pack-box, read
// by airport-discard (throw one away). pack-box overwrites it on every commit,
// so a replay resets it naturally. Deep-linking straight to airport-discard
// finds it empty — that question handles it with a "nothing to throw away"
// fallback (debug-only concern).
export const box = $state({
	/** @type {string[]} */
	items: [],
	/**
	 * The id of the FIRST item placed in the box this pack-box session, read by
	 * balance-scale (which weighs it, among other of the taker's own past
	 * choices, against a car). `items` cannot supply this: its order tracks the
	 * LAST time each piece was placed, because re-dragging removes and re-adds the
	 * key. So pack-box records the first placement explicitly. Null until the
	 * first piece lands, and reset at the start of each pack-box session.
	 * @type {string | null}
	 */
	firstPacked: null
});

// Dev-only console handle, matching __stash / __recall / __scene.
//   __box.box.firstPacked = 'guitar'   → pretend the guitar was packed first
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__box = { box };
}
