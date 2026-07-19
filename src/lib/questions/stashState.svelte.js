// Cross-question state: whether the taker stashed the weapon under the stack of
// paper in Q53 — and, if so, exactly when.
//
// Storing a TIMESTAMP rather than a stage or a mounted-at clock is what makes
// the escalation survive everything: the overlay derives elapsed time from
// `hiddenAt`, so a remount (or a question change, or a resize) resumes at the
// right point instead of restarting the arc from the beginning.
//
// Cleared when the flow reaches an interlude — that is the "until the next
// interlude" bound — and on restart. Consumers must handle `null`.
export const stash = $state({
	/** @type {number | null} performance.now() at the moment of the pick */
	hiddenAt: null
});

/** Idempotent: re-picking (or a stray second call) must not restart the clock. */
export function hideWeapon() {
	if (stash.hiddenAt === null) stash.hiddenAt = performance.now();
}

export function clearStash() {
	stash.hiddenAt = null;
}

// Dev-only console handle. Q53 sits near the end of the quiz, so in normal play
// the pool only has a couple of questions to spread across — this is the
// practical way to inspect the whole arc. Stripped from production builds.
//   __stash.hideWeapon()                                  → start the arc
//   __stash.stash.hiddenAt = performance.now() - 70000    → jump to 70s in
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__stash = { stash, hideWeapon, clearStash };
}
