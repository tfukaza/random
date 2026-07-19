/**
 * Howler 2.2.4 rebuilds its global AudioContext during mobile unlock whenever
 * the device sample rate is not exactly 44.1 kHz. Modern iOS commonly uses
 * 48 kHz, so that rebuild unloads every Howl the app created before the first
 * gesture. Tell Howler the legacy rebuild has already happened while leaving
 * its normal gesture unlock and `unlock` events enabled.
 *
 * Remove this workaround once Howler no longer unloads on a non-44.1 kHz
 * context during `_unlockAudio`.
 *
 * @param {object} howler
 */
export function preserveHowlsDuringMobileUnlock(howler) {
	Reflect.set(howler, '_mobileUnloaded', true);
}

/**
 * Modern iPads can request desktop sites and identify their platform as a Mac,
 * so touch capability is needed in addition to the traditional iOS user agent.
 *
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number }} navigatorLike
 */
export function needsIosHtml5Audio(navigatorLike) {
	const userAgent = navigatorLike.userAgent ?? '';
	const platform = navigatorLike.platform ?? '';
	return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && (navigatorLike.maxTouchPoints ?? 0) > 1);
}

/**
 * Howler defers HTML media `play()` until `canplaythrough`. On iOS that can be
 * too late: a large music file may still be buffering after the user-activation
 * window has closed. Start the media node while the tap is still on the stack;
 * Howler will take over the same node once its load queue becomes ready.
 *
 * @param {object} howl
 * @param {{ volume: number, rate: number, loop: boolean }} options
 * @returns {boolean}
 */
export function primeIosHtml5Music(howl, options) {
	const sounds = Reflect.get(howl, '_sounds');
	const node = Array.isArray(sounds) ? Reflect.get(sounds[0] ?? {}, '_node') : null;
	if (!(node instanceof HTMLMediaElement)) return false;
	node.volume = options.volume;
	node.playbackRate = options.rate;
	node.loop = options.loop;
	const playResult = node.play();
	if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {});
	return true;
}
