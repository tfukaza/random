// Cross-question state: whether the taker shoved the wet paintbrush under the
// stack of paper in hide-brush — and, if so, exactly when.
//
// Storing a TIMESTAMP rather than a stage or a mounted-at clock is what makes
// the escalation survive everything: the overlay derives elapsed time from
// `hiddenAt`, so a remount (or a question change, or a resize) resumes at the
// right point instead of restarting the arc from the beginning.
//
// NOT cleared by interludes: the paint is permanent for the rest of the run.
// `clearStash` exists solely for starting the quiz over, which must not begin
// pre-stained. Consumers must handle `null`.
export const stash = $state({
	/** @type {number | null} performance.now() at the moment of the pick */
	hiddenAt: null
});

/** Idempotent: re-picking (or a stray second call) must not restart the clock. */
export function hideBrush() {
	if (stash.hiddenAt === null) stash.hiddenAt = performance.now();
}

export function clearStash() {
	stash.hiddenAt = null;
}

// Dev-only console handle — the practical way to inspect the whole 90s arc
// without replaying to the question. Stripped from production builds.
//   __stash.hideBrush()                                   → start the arc
//   __stash.stash.hiddenAt = performance.now() - 70000    → jump to 70s in
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__stash = { stash, hideBrush, clearStash };
}
