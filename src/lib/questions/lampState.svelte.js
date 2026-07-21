// Cross-question state: whether the taker answered "dark mode" in
// light-or-dark — and, if so, exactly when. Same discipline as stashState and
// couponState: a TIMESTAMP, not a boolean, because the whole lamp choreography
// (room darkens → lamp sputters on → steady vintage glow, blackouts on a
// schedule) is derived from elapsed time since `litAt`. A remount — question
// change, resize, the report mounting — resumes mid-arc instead of replaying
// the lights-out from the top.
//
// NOT cleared by interludes or the report: once the room is dark, it stays
// dark for the rest of the run. `clearLamp` exists only for starting over.
export const lamp = $state({
	/** @type {number | null} performance.now() at the moment dark mode was submitted */
	litAt: null,
	/**
	 * Set when the run ends and the room lights should come back. The overlay
	 * fades itself out from this moment and then calls clearLamp() — never cut
	 * straight from a dark room to a bright page; that flash is genuinely
	 * unpleasant. @type {number | null}
	 */
	douseAt: null
});

/** Idempotent: a stray second call must not restart the lights-out. */
export function lightLamp() {
	if (lamp.litAt === null) lamp.litAt = performance.now();
}

/** Begin bringing the room lights back up (no-op if the lamp isn't lit). */
export function douseLamp() {
	if (lamp.litAt !== null && lamp.douseAt === null) lamp.douseAt = performance.now();
}

export function clearLamp() {
	lamp.litAt = null;
	lamp.douseAt = null;
}

// Dev-only console handle, matching __stash / __coupon / __recall / __scene.
//   __lamp.lightLamp()                                  → turn the room dark
//   __lamp.lamp.litAt = performance.now() - 60000       → jump 60s into the arc
//   __lamp.debug.severity = 7                           → force a difficulty tier
//   __lamp.debug.patient = true / .impatient = true     → force outage / snap-on
//   __lamp.debug.supporter = true                       → force the Ko-fi bulb
// LampOverlay reads `debug` once at mount, so set these BEFORE lighting it.
export const lampDebug = $state({
	/** @type {number | null} */ severity: null,
	/** @type {boolean | null} */ patient: null,
	/** @type {boolean | null} */ impatient: null,
	/** @type {boolean | null} */ supporter: null
});

if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__lamp = { lamp, lightLamp, clearLamp, debug: lampDebug };
}
