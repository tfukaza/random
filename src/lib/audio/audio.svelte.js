import { AudioCoordinator, musicRateMode } from './audio-engine.js';
import { normalizeMusicRate } from './mix.js';
import { MUSIC_ASSETS, SFX_ASSETS, WebAudioTransport } from './web-audio-transport.js';

const STORAGE_KEY = 'personality-quiz-sound';
const RESPONSIVE_SFX = new Set([
	'ui-tap',
	'ui-toggle',
	'ui-confirm',
	'slider-detent',
	'drag-pickup',
	'drop-valid',
	'drop-invalid'
]);

export const audioState = $state({
	enabled: true,
	started: false,
	ready: false,
	rate: 1,
	musicTrack: '',
	musicFailed: false,
	/** @type {'idle' | 'locked' | 'loading' | 'playing' | 'silent' | 'interrupted' | 'recoverable' | 'error'} */
	status: 'idle',
	requestedTrack: '',
	activeTrack: '',
	cueKey: '',
	interruptionReason: '',
	errorCategory: '',
	revision: 0
});

/** @type {Array<{ at: number, event: string, detail: Record<string, unknown> }>} */
const traceEntries = [];
let hydrated = false;
let scopeSerial = 0;
/** @type {WebAudioTransport | null} */
let transport = null;
/** @type {AudioCoordinator | null} */
let coordinator = null;
const legacyDucks = new Map();

/** @param {string} event @param {Record<string, unknown>} [detail] */
function trace(event, detail = {}) {
	traceEntries.push({
		at: typeof performance === 'undefined' ? Date.now() : performance.now(),
		event,
		detail
	});
	if (traceEntries.length > 240) traceEntries.splice(0, traceEntries.length - 240);
}

/** @param {Record<string, unknown>} patch */
function applyState(patch) {
	const next = { ...patch };
	if ('rate' in next) {
		const rate = next.rate;
		next.rate =
			rate === 'slow' ? 1 / 3 : rate === 'fast' ? 5 : rate === 'normal' ? 1 : normalizeMusicRate(Number(rate));
	}
	Object.assign(audioState, next);
}

function runtime() {
	if (coordinator && transport) return { coordinator, transport };
	const nextTransport = new WebAudioTransport({ onTrace: trace });
	const nextCoordinator = new AudioCoordinator({
		transport: nextTransport,
		enabled: audioState.enabled,
		onState: applyState,
		onTrace: trace
	});
	const resumeInterrupted = () => {
		if (audioState.status === 'interrupted' || audioState.status === 'recoverable')
			void nextCoordinator.resume();
	};
	nextTransport.setHandlers({
		onNaturalEnd: (cueKey) => nextCoordinator.naturalEnd(cueKey),
		onContextState: (state) => nextCoordinator.markInterrupted(state),
		onContextRunning: () => {
			// Native running events also fire for our own activate/recover calls. Only
			// treat one as auto-recovery when public state says an interruption is
			// actually outstanding; otherwise it can reconcile a pre-recovery cue.
			resumeInterrupted();
		},
		onSessionActive: resumeInterrupted
	});
	nextTransport.setMuted(!audioState.enabled);
	transport = nextTransport;
	coordinator = nextCoordinator;
	return { coordinator: nextCoordinator, transport: nextTransport };
}

/** @param {string} id */
function assertMusic(id) {
	if (!(id in MUSIC_ASSETS)) throw new TypeError(`Unknown music track: ${id}`);
}

/** @param {string} id */
function assertSfx(id) {
	if (!(id in SFX_ASSETS)) throw new TypeError(`Unknown sound effect: ${id}`);
}

export const audio = {
	activateFromGesture() {
		const current = runtime();
		if (audioState.enabled) current.transport.preloadCompressed();
		return current.coordinator.activateFromGesture();
	},

	recoverFromGesture() {
		return runtime().coordinator.recoverFromGesture();
	},

	/** @param {boolean} enabled */
	setEnabled(enabled) {
		const value = !!enabled;
		const current = runtime();
		if (value) current.transport.preloadCompressed();
		const request = current.coordinator.setEnabled(value);
		try {
			localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
		} catch {
			// Preference storage can be disabled in private browsing; sound still works.
		}
		return request;
	},

	/** @param {keyof typeof MUSIC_ASSETS} track */
	prepareMusic(track) {
		assertMusic(track);
		const current = runtime();
		current.transport.preloadCompressed();
		return current.coordinator.prepareMusic(track);
	},

	music: {
		/**
		 * @param {keyof typeof MUSIC_ASSETS} track
		 * @param {{ cueKey?: string, rate?: 'slow' | 'normal' | 'fast' | number, startOffset?: number, restart?: boolean, transition?: { ms?: number } | 'cut' }} [options]
		 */
		play(track, options = {}) {
			assertMusic(track);
			return runtime().coordinator.play(track, options);
		},

		/** @param {{ transition?: { ms?: number } | 'cut' }} [options] */
		stop(options = {}) {
			return runtime().coordinator.stop(options);
		},

		/** @param {'slow' | 'normal' | 'fast' | number} rate @param {{ rampMs?: number }} [options] */
		setRate(rate, options = {}) {
			return runtime().coordinator.setRate(rate, options);
		},

		/**
		 * Hands the equalizer question's answer to the music bus. Like duck(),
		 * this goes straight to the transport: it changes how the music sounds,
		 * never what is playing, so it has no business in the coordinator's
		 * intent revisions. Applies to every track from here on.
		 * @param {number[]} gainsDb @param {{ rampMs?: number }} [options]
		 */
		setEq(gainsDb, options = {}) {
			runtime().transport.setMusicEq(gainsDb, options.rampMs);
		},

		/** @param {string} label @param {number} amount */
		duck(label, amount) {
			const owner = Symbol(label);
			const currentTransport = runtime().transport;
			currentTransport.setDuck(owner, amount);
			let released = false;
			return () => {
				if (released) return;
				released = true;
				currentTransport.clearDuck(owner);
			};
		}
	},

	sfx: {
		/**
		 * @param {keyof typeof SFX_ASSETS} id
		 * @param {{ volume?: number, rate?: number, tag?: string, maxLatencyMs?: number }} [options]
		 */
		play(id, options = {}) {
			assertSfx(id);
			if (!audioState.enabled || !audioState.started) return Promise.resolve(null);
			return runtime().transport.playSfx(id, {
				...options,
				maxLatencyMs:
					options.maxLatencyMs ?? (RESPONSIVE_SFX.has(id) ? 150 : Number.POSITIVE_INFINITY)
			});
		},

		/** @param {string} tag */
		stop(tag) {
			runtime().transport.stopSfx(tag);
		},

		/** @param {string} name */
		createScope(name) {
			const scope = `${name}:${++scopeSerial}`;
			const currentTransport = runtime().transport;
			let disposed = false;
			return {
				/**
				 * @param {keyof typeof SFX_ASSETS} id
				 * @param {{ volume?: number, rate?: number, tag?: string, maxLatencyMs?: number }} [options]
				 */
				play(id, options = {}) {
					assertSfx(id);
					if (disposed || !audioState.enabled || !audioState.started)
						return Promise.resolve(null);
					return currentTransport.playSfx(id, {
						...options,
						tag: options.tag ? `${scope}:${options.tag}` : undefined,
						scope,
						maxLatencyMs: options.maxLatencyMs ?? Number.POSITIVE_INFINITY
					});
				},
				stop() {
					currentTransport.stopSfxScope(scope);
				},
				dispose() {
					if (disposed) return;
					disposed = true;
					currentTransport.stopSfxScope(scope);
				}
			};
		}
	},

	suspend() {
		return runtime().coordinator.suspend();
	},

	resume() {
		return runtime().coordinator.resume();
	},

	async dispose() {
		const currentCoordinator = coordinator;
		coordinator = null;
		transport = null;
		legacyDucks.clear();
		if (currentCoordinator) await currentCoordinator.dispose();
		applyState({
			started: false,
			ready: false,
			musicTrack: '',
			requestedTrack: '',
			activeTrack: '',
			cueKey: '',
			status: 'idle',
			interruptionReason: '',
			errorCategory: ''
		});
	}
};

export function hydrateAudioPreference() {
	if (hydrated) return;
	hydrated = true;
	let saved = null;
	try {
		saved = localStorage.getItem(STORAGE_KEY);
	} catch {
		return;
	}
	if (saved !== 'on' && saved !== 'off') return;
	const enabled = saved === 'on';
	if (audioState.enabled === enabled) return;
	runtime().coordinator.setEnabled(enabled);
}

// Compatibility exports keep existing question components small while all of
// them route through the same coordinator and graph.
export function startAudio() {
	return audio.activateFromGesture();
}

/** @param {boolean} enabled */
export function setAudioEnabled(enabled) {
	return audio.setEnabled(enabled);
}

/** @param {'slow' | 'normal' | 'fast' | number} rate */
export function setMusicRate(rate) {
	return audio.music.setRate(musicRateMode(rate));
}

/** @param {keyof typeof MUSIC_ASSETS} id @param {{ restart?: boolean }} [options] */
export function setMusicTrack(id, options = {}) {
	return audio.music.play(id, { cueKey: `legacy:${id}`, restart: options.restart });
}

export function stopMusic() {
	return audio.music.stop();
}

/** @param {string} key @param {number} amount */
export function duckMusic(key, amount) {
	legacyDucks.get(key)?.();
	legacyDucks.set(key, audio.music.duck(`legacy:${key}`, amount));
}

/** @param {string} key */
export function clearMusicDuck(key) {
	legacyDucks.get(key)?.();
	legacyDucks.delete(key);
}

/**
 * @param {keyof typeof SFX_ASSETS} id
 * @param {{ volume?: number, rate?: number, tag?: string, maxLatencyMs?: number }} [options]
 */
export function playSfx(id, options = {}) {
	return audio.sfx.play(id, options);
}

/** @param {string} tag */
export function stopSfx(tag) {
	audio.sfx.stop(tag);
}

export function suspendAudio() {
	return audio.suspend();
}

export function resumeAudio() {
	return audio.resume();
}

export function playReaderTick() {
	if (!audioState.enabled || !audioState.started) return;
	runtime().transport.playReaderTick();
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
	const debug = {
		snapshot: () => JSON.parse(JSON.stringify(audioState)),
		suspend: () => audio.suspend(),
		play: (/** @type {keyof typeof MUSIC_ASSETS} */ track, options = {}) =>
			audio.music.play(track, options).whenStarted,
		stop: () => audio.music.stop({ transition: 'cut' }).whenStarted,
		get trace() {
			return traceEntries.map((entry) => ({ ...entry, detail: { ...entry.detail } }));
		}
	};
	/** @type {any} */ (window).__quizAudio = debug;
	Object.defineProperty(window, '__quizAudioTrace', {
		configurable: true,
		get: () => debug.trace
	});
}
