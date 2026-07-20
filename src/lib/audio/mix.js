export const MUSIC_RATES = Object.freeze({
	normal: 1,
	slow: 1 / 3,
	fast: 5
});

/** Preserve the three authored playback modes and reject invalid input. */
export function normalizeMusicRate(/** @type {number} */ value) {
	const finite = Number.isFinite(value) ? value : 1;
	return finite < 0.5 ? MUSIC_RATES.slow : finite >= 4 ? MUSIC_RATES.fast : 1;
}

/**
 * Schedule a live music-rate transition on one native AudioParam. Setting the
 * exact endpoint matters: Safari can otherwise remain infinitesimally off the
 * requested rate after a setTargetAtTime glide, and a later reversal starts
 * from that stale automation.
 *
 * @param {{ value: number, cancelScheduledValues: (time: number) => unknown, cancelAndHoldAtTime?: (time: number) => unknown, setValueAtTime: (value: number, time: number) => unknown, exponentialRampToValueAtTime?: (value: number, time: number) => unknown, linearRampToValueAtTime?: (value: number, time: number) => unknown }} param
 * @param {number} rate
 * @param {number} now
 * @param {number} [duration]
 * @param {number} [heldValue]
 */
export function scheduleMusicRate(param, rate, now, duration = 1, heldValue) {
	const target = normalizeMusicRate(rate);
	const current =
		Number.isFinite(heldValue) && Number(heldValue) > 0
			? Number(heldValue)
			: Number.isFinite(param.value) && param.value > 0
				? param.value
				: 1;
	const start = Number.isFinite(now) ? Math.max(0, now) : 0;
	const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0;
	if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(start);
	else {
		param.cancelScheduledValues(start);
		param.setValueAtTime(current, start);
	}
	if (seconds === 0) {
		param.setValueAtTime(target, start);
		return target;
	}
	if (typeof param.exponentialRampToValueAtTime === 'function')
		param.exponentialRampToValueAtTime(target, start + seconds);
	else if (typeof param.linearRampToValueAtTime === 'function')
		param.linearRampToValueAtTime(target, start + seconds);
	else param.setValueAtTime(target, start + seconds);
	return target;
}

/**
 * The default score was remastered at its loudest (slow-mode) gain. These
 * values reconstruct the previous normal, patient, and impatient mix without
 * asking the native gain graph for a value above 1.
 * @param {'default' | 'asteroid' | 'report'} track
 * @param {number} rate
 * @param {number} [duck]
 */
export function musicVolume(track, rate, duck = 1) {
	const safeDuck = Number.isFinite(duck) ? Math.max(0, Math.min(1, duck)) : 1;
	if (track !== 'default') return safeDuck;
	const rateLevel = rate >= 4 ? 0.48 : rate < 0.5 ? 1 : 2 / 3;
	return Math.max(0, Math.min(1, rateLevel * safeDuck));
}

/** @param {number | undefined} value */
export function normalizeSfxVolume(value) {
	const finite = value === undefined ? 1 : Number.isFinite(value) ? value : 1;
	return Math.max(0, Math.min(1, finite));
}

/** Clamp effect playback to the consistently supported Web Audio range. */
export function normalizeSfxRate(/** @type {number | undefined} */ value) {
	const finite = value === undefined ? 1 : Number.isFinite(value) ? value : 1;
	return Math.max(0.5, Math.min(4, finite));
}
