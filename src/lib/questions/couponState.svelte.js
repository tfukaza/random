// Cross-question state: whether the taker put the expired coupon away unused in
// expired-coupon — and, if so, when. Same shape and spirit as stashState: a
// timestamp, not a boolean, so the slip's one-time slide-in can resume at the
// right point across a remount instead of replaying from the start.
//
// Only the FIRST option of expired-coupon — "say nothing, put it away, and pay
// full price" — tucks it. Every other answer is an attempt to USE the coupon
// (politely, or by escalating to law enforcement), so the coupon does not end up
// forgotten under the papers; it ends up brandished.
//
// NOT cleared by interludes: like the paint, the tucked coupon is a fact about
// the run that persists to the end. `clearCoupon` exists only for starting over.
export const coupon = $state({
	/** @type {number | null} performance.now() at the moment it was put away */
	tuckedAt: null
});

/** Idempotent: re-answering must not restart the slide-in. */
export function tuckCoupon() {
	if (coupon.tuckedAt === null) coupon.tuckedAt = performance.now();
}

export function clearCoupon() {
	coupon.tuckedAt = null;
}

// Dev-only console handle, matching __stash / __recall / __scene.
//   __coupon.tuckCoupon()   → slide the coupon under the stack
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__coupon = { coupon, tuckCoupon, clearCoupon };
}
