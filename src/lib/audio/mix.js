export const MUSIC_RATES = Object.freeze({
	normal: 1,
	slow: 1 / 3,
	fast: 5
});

/**
 * Preserve the authored 1/3x and 5x modes on Web Audio. Howler's HTML audio
 * fallback uses its documented-safe range so an old browser stays audible.
 * @param {number} value
 * @param {boolean} [usingWebAudio]
 */
export function normalizeMusicRate(value, usingWebAudio = true) {
	const finite = Number.isFinite(value) ? value : 1;
	const requested = finite < 0.5 ? MUSIC_RATES.slow : finite >= 4 ? MUSIC_RATES.fast : 1;
	if (usingWebAudio) return requested;
	return requested === MUSIC_RATES.slow ? 0.5 : requested === MUSIC_RATES.fast ? 4 : 1;
}

/**
 * Exponential easing approximates the old AudioParam `setTargetAtTime` glide:
 * most of the pitch change happens early, then the record audibly settles onto
 * its exact final speed.
 * @param {number} from
 * @param {number} to
 * @param {number} progress
 */
export function glidingMusicRate(from, to, progress) {
	const safeFrom = Number.isFinite(from) && from > 0 ? from : 1;
	const safeTo = Number.isFinite(to) && to > 0 ? to : 1;
	const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1;
	if (p === 0) return safeFrom;
	if (p === 1) return safeTo;
	const eased = (1 - Math.exp(-5 * p)) / (1 - Math.exp(-5));
	return safeFrom + (safeTo - safeFrom) * eased;
}

/**
 * The default score was remastered at its loudest (slow-mode) gain. These
 * values reconstruct the previous normal, patient, and impatient mix without
 * asking Howler for a volume above 1.
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

/** @param {number | undefined} value */
export function normalizeSfxRate(value) {
	const finite = value === undefined ? 1 : Number.isFinite(value) ? value : 1;
	return Math.max(0.5, Math.min(4, finite));
}
