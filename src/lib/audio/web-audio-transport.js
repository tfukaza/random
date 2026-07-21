import {
	MUSIC_RATES,
	musicVolume,
	normalizeSfxRate,
	normalizeSfxVolume,
	scheduleMusicRate
} from './mix.js';
import { configureAudioSession } from './audio-session.js';

export const MUSIC_ASSETS = Object.freeze({
	default: { path: '/audio/music/puzzle-chamber-loop.mp3', loop: true, rateSensitive: true },
	asteroid: { path: '/audio/music/asteroid-countdown.mp3', loop: false, rateSensitive: false },
	report: { path: '/audio/music/victorian-victory.mp3', loop: true, rateSensitive: false }
});

export const SFX_ASSETS = Object.freeze({
	'ui-tap': '/audio/sfx/ui-tap.mp3',
	'ui-toggle': '/audio/sfx/ui-toggle.mp3',
	'ui-confirm': '/audio/sfx/ui-confirm.mp3',
	'slider-detent': '/audio/sfx/slider-detent.mp3',
	'drag-pickup': '/audio/sfx/drag-pickup.mp3',
	'drop-valid': '/audio/sfx/drop-valid.mp3',
	'drop-invalid': '/audio/sfx/drop-invalid.mp3',
	'page-turn': '/audio/sfx/page-turn.mp3',
	'chat-send': '/audio/sfx/chat-send.mp3',
	'illusion-reveal': '/audio/sfx/illusion-reveal.mp3',
	'balance-settle': '/audio/sfx/balance-settle.mp3',
	'elevator-button': '/audio/sfx/elevator-button.mp3',
	'elevator-approach': '/audio/sfx/elevator-approach.mp3',
	'elevator-open': '/audio/sfx/elevator-open.mp3',
	'elevator-shut': '/audio/sfx/elevator-shut.mp3',
	'asteroid-warning': '/audio/sfx/asteroid-warning.mp3',
	'asteroid-approach': '/audio/sfx/asteroid-approach.mp3',
	'asteroid-impact': '/audio/sfx/asteroid-impact.mp3',
	'result-reveal': '/audio/sfx/result-reveal.mp3'
});

// The six bands the equalizer question offers, in fader order. Exported so the
// question renders exactly the filters that exist — six labels and six nodes
// that could drift apart is the one bug this feature can't detect at runtime.
// Shelves on the endpoints, not peaks: dragging Sub or Treble should move
// everything below/above it, not poke a narrow hole near the edge of hearing.
export const MUSIC_EQ_BANDS = Object.freeze([
	{ label: 'Sub', type: 'lowshelf', frequency: 60 },
	{ label: 'Bass', type: 'peaking', frequency: 150, Q: 1 },
	{ label: 'Low mid', type: 'peaking', frequency: 400, Q: 1 },
	{ label: 'Mid', type: 'peaking', frequency: 1000, Q: 1 },
	{ label: 'Presence', type: 'peaking', frequency: 3000, Q: 1 },
	{ label: 'Treble', type: 'highshelf', frequency: 8000 }
]);

export const MUSIC_EQ_LIMIT_DB = 12;

const CORE_SFX = [
	'ui-tap',
	'ui-toggle',
	'ui-confirm',
	'slider-detent',
	'drag-pickup',
	'drop-valid',
	'drop-invalid'
];
const FETCH_TIMEOUT_MS = 8000;
const CONTEXT_OPERATION_TIMEOUT_MS = 4000;
const DECODE_TIMEOUT_MS = 10000;
// Long enough to cross Firefox's coarsest common currentTime privacy bucket,
// while still keeping foreground recovery perceptually immediate.
const CLOCK_PROBE_MS = 160;
const MAX_SFX_VOICES = 18;
const TIMED_OUT = Symbol('audio-operation-timed-out');

/** @param {unknown} value */
function rateValue(value) {
	if (value === 'slow') return MUSIC_RATES.slow;
	if (value === 'fast') return MUSIC_RATES.fast;
	return 1;
}

/** @param {AudioScheduledSourceNode | null | undefined} source */
function safeStop(source) {
	try {
		source?.stop();
	} catch {
		// A finite source can end between the ownership check and stop().
	}
}

/** @param {{ disconnect?: () => void } | null | undefined} node */
function safeDisconnect(node) {
	try {
		node?.disconnect?.();
	} catch {
		// Disconnecting an already-disconnected Safari node is harmless.
	}
}

/** @param {unknown} value */
function clampEqGain(value) {
	const db = Number(value);
	if (!Number.isFinite(db)) return 0;
	return Math.max(-MUSIC_EQ_LIMIT_DB, Math.min(MUSIC_EQ_LIMIT_DB, db));
}

/** @param {AudioParam} param @param {number} now @param {number} value */
function holdParam(param, now, value) {
	if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
	else {
		param.cancelScheduledValues(now);
		param.setValueAtTime(value, now);
	}
}

/** @param {number} ms @param {AbortSignal} [signal] */
function wait(ms, signal) {
	return new Promise((resolve) => {
		if (signal?.aborted) {
			resolve(undefined);
			return;
		}
		const finish = () => {
			clearTimeout(timer);
			signal?.removeEventListener('abort', finish);
			resolve(undefined);
		};
		const timer = setTimeout(finish, Math.max(0, ms));
		signal?.addEventListener('abort', finish, { once: true });
	});
}

/**
 * Platform promises are not guaranteed to settle when autoplay policy or a
 * broken decoder gets involved. Resolve a sentinel instead of leaving the
 * coordinator and scene clocks waiting forever. The attached handlers also
 * consume a late rejection from the abandoned platform promise.
 * @template T
 * @param {PromiseLike<T> | T} operation
 * @param {number} timeoutMs
 * @returns {Promise<T | typeof TIMED_OUT>}
 */
async function bounded(operation, timeoutMs) {
	let timer;
	try {
		return await Promise.race([
			Promise.resolve(operation),
			new Promise((resolve) => {
				timer = setTimeout(() => resolve(TIMED_OUT), Math.max(0, timeoutMs));
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

function cancellationDeferred() {
	let resolve = () => {};
	const promise = new Promise((done) => {
		resolve = () => done(undefined);
	});
	return { promise, resolve };
}

function monotonicNow() {
	return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/**
 * The only module allowed to create Web Audio nodes. Music orchestration stays
 * in AudioCoordinator; this class owns one graph, one music voice, decoding,
 * and short-lived effect voices.
 */
export class WebAudioTransport {
	/**
	 * @param {{
	 *   onTrace?: (event: string, detail?: Record<string, unknown>) => void,
	 *   contextOperationTimeoutMs?: number,
	 *   decodeTimeoutMs?: number,
	 *   clockProbeMs?: number
	 * }} [options]
	 */
	constructor({
		onTrace = () => {},
		contextOperationTimeoutMs = CONTEXT_OPERATION_TIMEOUT_MS,
		decodeTimeoutMs = DECODE_TIMEOUT_MS,
		clockProbeMs = CLOCK_PROBE_MS
	} = {}) {
		this.onTrace = onTrace;
		this.contextOperationTimeoutMs = Math.max(
			1,
			Number(contextOperationTimeoutMs) || CONTEXT_OPERATION_TIMEOUT_MS
		);
		this.decodeTimeoutMs = Math.max(1, Number(decodeTimeoutMs) || DECODE_TIMEOUT_MS);
		this.clockProbeMs = Math.max(1, Number(clockProbeMs) || CLOCK_PROBE_MS);
		this.handlers = {
			onContextState: (/** @type {string} */ _state) => {},
			onContextRunning: () => {},
			onSessionActive: () => {},
			onNaturalEnd: (/** @type {string} */ _cueKey) => {}
		};
		/** @type {AudioContext | null} */
		this.context = null;
		/** @type {GainNode | null} */
		this.masterGain = null;
		/** @type {GainNode | null} */
		this.musicBus = null;
		/** @type {GainNode | null} */
		this.sfxBus = null;
		/** @type {DynamicsCompressorNode | null} */
		this.limiter = null;
		// The taker's answer to the equalizer question, in dB per band. Held on
		// the instance rather than in the graph so it outlives any context: a
		// recovery rebuild reads it back in _ensureContext, and an answer given
		// before audio is unlocked still lands when the context finally exists.
		this.eqGains = MUSIC_EQ_BANDS.map(() => 0);
		/** @type {BiquadFilterNode[] | null} */
		this.eqNodes = null;
		/** @type {Map<string, ArrayBuffer>} */
		this.encoded = new Map();
		/** @type {Map<string, Promise<ArrayBuffer | null>>} */
		this.pendingFetches = new Map();
		/** @type {Set<AbortController>} */
		this.fetchControllers = new Set();
		/** @type {Map<string, { generation: number, buffer: AudioBuffer }>} */
		this.decoded = new Map();
		/** @type {Map<string, Promise<AudioBuffer | null>>} */
		this.pendingDecodes = new Map();
		/** @type {any} */
		this.activeMusic = null;
		/** @type {Promise<void> | null} */
		this.musicStop = null;
		/** @type {AbortController | null} */
		this.musicStopAbort = null;
		/** @type {any} */
		this.stoppingMusic = null;
		/** @type {Set<any>} */
		this.sfxVoices = new Set();
		/** @type {Set<any>} */
		this.pendingSfx = new Set();
		/** @type {Map<string, any>} */
		this.taggedSfx = new Map();
		/** @type {Map<string, Set<any>>} */
		this.scopedSfx = new Map();
		this.ducks = new Map();
		this.generation = 0;
		this.muted = false;
		this.disposed = false;
		this.preloadScheduled = false;
		this.session = null;
		this.sessionListener = null;
		this.contextListener = null;
		this.intentionalSuspend = null;
		this.intentionalSuspendTimer = null;
		this.lastPosition = 0;
	}

	/** @param {Partial<typeof this.handlers>} handlers */
	setHandlers(handlers) {
		Object.assign(this.handlers, handlers);
	}

	preloadCompressed() {
		if (this.disposed || typeof fetch === 'undefined') return;
		void this._load('music:default', MUSIC_ASSETS.default.path);
		for (const id of CORE_SFX)
			void this._load(`sfx:${id}`, SFX_ASSETS[/** @type {keyof typeof SFX_ASSETS} */ (id)]);
	}

	_configurePlatform() {
		if (typeof navigator === 'undefined' || this.session) return;
		const session = configureAudioSession(/** @type {any} */ (navigator));
		if (!session || typeof session.addEventListener !== 'function') return;
		this.session = session;
		this.sessionListener = () => {
			const state = String(session.state || 'unknown');
			this.onTrace('audio-session', { state });
			if (state === 'active') this.handlers.onSessionActive();
			else if (state === 'interrupted') this.handlers.onContextState('session-interrupted');
			// `inactive` is the ordinary no-current-playback state, not a failed
			// session. Showing a restore prompt for it makes intentional silence look
			// broken, so it remains trace-only.
		};
		session.addEventListener('statechange', this.sessionListener);
	}

	/** @param {AudioContext} context @param {string} reason */
	async _closeContext(context, reason) {
		if (context.state === 'closed') return true;
		try {
			const result = await bounded(context.close(), this.contextOperationTimeoutMs);
			if (result === TIMED_OUT) {
				this.onTrace('context-close-timeout', { reason });
				return false;
			}
			return true;
		} catch (error) {
			this.onTrace('context-close-error', { reason, message: String(error) });
			return false;
		}
	}

	/** @param {AudioContext} context */
	_expectIntentionalSuspend(context) {
		const token = { context };
		this.intentionalSuspend = token;
		clearTimeout(this.intentionalSuspendTimer);
		this.intentionalSuspendTimer = setTimeout(
			() => {
				if (this.intentionalSuspend === token) this.intentionalSuspend = null;
				this.intentionalSuspendTimer = null;
			},
			Math.max(1000, this.contextOperationTimeoutMs * 2)
		);
		return token;
	}

	/** @param {AudioContext} context */
	_consumeIntentionalSuspend(context) {
		if (this.intentionalSuspend?.context !== context) return false;
		this.intentionalSuspend = null;
		clearTimeout(this.intentionalSuspendTimer);
		this.intentionalSuspendTimer = null;
		return true;
	}

	_clearIntentionalSuspend() {
		this.intentionalSuspend = null;
		clearTimeout(this.intentionalSuspendTimer);
		this.intentionalSuspendTimer = null;
	}

	_ensureContext() {
		if (this.disposed) return null;
		// A closed graph cannot be repaired piecemeal: keeping its source records
		// while silently constructing a new context would make the coordinator
		// mistake a dead voice for the current cue. Recovery owns reconstruction.
		if (this.context) return this.context.state === 'closed' ? null : this.context;
		if (typeof window === 'undefined') return null;
		this._configurePlatform();
		const Context = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
		if (!Context) return null;

		/** @type {AudioContext | null} */
		let context = null;
		/** @type {GainNode | null} */
		let masterGain = null;
		/** @type {GainNode | null} */
		let musicBus = null;
		/** @type {GainNode | null} */
		let sfxBus = null;
		/** @type {DynamicsCompressorNode | null} */
		let limiter = null;
		/** @type {BiquadFilterNode[] | null} */
		let eqNodes = null;
		/** @type {(() => void) | null} */
		let contextListener = null;
		const generation = this.generation + 1;
		try {
			context = new Context();
			const createdContext = context;
			masterGain = context.createGain();
			musicBus = context.createGain();
			sfxBus = context.createGain();
			limiter = context.createDynamicsCompressor();

			limiter.threshold.value = -3;
			limiter.knee.value = 1;
			limiter.ratio.value = 20;
			limiter.attack.value = 0.003;
			limiter.release.value = 0.12;
			masterGain.gain.value = this.muted ? 0 : 1;
			musicBus.gain.value = 1;
			sfxBus.gain.value = 1;
			// The equalizer sits on the music bus, ahead of the limiter — so it
			// colours every track without any per-voice re-application, and so a
			// boosted curve still meets clip protection on the way out. SFX join
			// downstream of both and stay uncoloured, which is deliberate: the
			// answer should shape the score, not the taker's own button clicks.
			eqNodes = this._createEqNodes(context);
			let musicTail = /** @type {AudioNode} */ (musicBus);
			for (const filter of eqNodes ?? []) {
				musicTail.connect(filter);
				musicTail = filter;
			}
			musicTail.connect(limiter);
			limiter.connect(masterGain);
			sfxBus.connect(masterGain);
			masterGain.connect(context.destination);

			contextListener = () => {
				if (this.context !== createdContext) return;
				const state = String(createdContext.state);
				const intentional =
					state === 'suspended' && this._consumeIntentionalSuspend(createdContext);
				this.onTrace('context-state', { state, generation, intentional });
				if (intentional) return;
				if (state === 'running') this.handlers.onContextRunning();
				else this.handlers.onContextState(state);
			};
			context.addEventListener('statechange', contextListener);
		} catch (error) {
			if (context && contextListener)
				context.removeEventListener?.('statechange', contextListener);
			safeDisconnect(musicBus);
			for (const filter of eqNodes ?? []) safeDisconnect(filter);
			safeDisconnect(sfxBus);
			safeDisconnect(limiter);
			safeDisconnect(masterGain);
			if (context) void this._closeContext(context, 'create-failure');
			this.onTrace('context-create-error', { message: String(error) });
			return null;
		}

		this.generation = generation;
		this.context = context;
		this.masterGain = masterGain;
		this.musicBus = musicBus;
		this.sfxBus = sfxBus;
		this.limiter = limiter;
		this.eqNodes = eqNodes;
		this.contextListener = contextListener;
		this.onTrace('context-created', { generation });
		return context;
	}

	/**
	 * Builds the band filters for a freshly created context, seeded from the
	 * gains already on the instance. Returns null when the context cannot make
	 * biquads at all — the caller then wires the bus straight to the limiter, so
	 * the quiz stays playable and only loses the colouring.
	 * @param {AudioContext} context
	 */
	_createEqNodes(context) {
		if (typeof context.createBiquadFilter !== 'function') return null;
		return MUSIC_EQ_BANDS.map((band, index) => {
			const filter = context.createBiquadFilter();
			filter.type = /** @type {BiquadFilterType} */ (band.type);
			filter.frequency.value = band.frequency;
			if (band.Q !== undefined && filter.Q) filter.Q.value = band.Q;
			filter.gain.value = clampEqGain(this.eqGains[index]);
			return filter;
		});
	}

	/** @param {AudioContext} context */
	_pulse(context) {
		try {
			const source = context.createBufferSource();
			const gain = context.createGain();
			source.buffer = context.createBuffer(1, 1, context.sampleRate);
			gain.gain.value = 0;
			source.connect(gain);
			gain.connect(context.destination);
			source.onended = () => {
				safeDisconnect(source);
				safeDisconnect(gain);
			};
			source.start();
		} catch (error) {
			this.onTrace('unlock-pulse-error', { message: String(error) });
		}
	}

	/** @param {AudioContext} context @param {string} reason */
	async _verifyRunningClock(context, reason) {
		const startedAt = context.currentTime;
		await wait(this.clockProbeMs);
		if (this.disposed || this.context !== context || context.state !== 'running') return false;
		const endedAt = context.currentTime;
		if (Number.isFinite(endedAt) && endedAt - startedAt > 0.001) return true;
		this.onTrace('context-clock-stalled', { reason, startedAt, endedAt });
		return false;
	}

	/**
	 * @param {AudioContext} context
	 * @param {Promise<void>} operation
	 * @param {string} reason
	 * @param {boolean} [verifyClock]
	 */
	async _finishResume(context, operation, reason, verifyClock = false) {
		try {
			const result = await bounded(operation, this.contextOperationTimeoutMs);
			if (result === TIMED_OUT) {
				this.onTrace('context-resume-timeout', { reason });
				return false;
			}
			const running =
				!this.disposed && this.context === context && context.state === 'running';
			if (!running) return false;
			return verifyClock ? this._verifyRunningClock(context, reason) : true;
		} catch (error) {
			this.onTrace('context-resume-error', { reason, message: String(error) });
			return false;
		}
	}

	async activate() {
		const context = this._ensureContext();
		if (!context) return false;
		// Both calls happen before the first await so iOS sees them inside the
		// trusted gesture rather than in a later promise continuation.
		let resumed;
		try {
			resumed = context.state === 'running' ? Promise.resolve() : context.resume();
		} catch (error) {
			this.onTrace('context-resume-error', { reason: 'activation', message: String(error) });
			this._pulse(context);
			return false;
		}
		this._pulse(context);
		const running = await this._finishResume(context, resumed, 'activation', true);
		if (running) this._schedulePreload();
		return running;
	}

	/** @param {{ verifyClock?: boolean }} [options] */
	async resume(options = {}) {
		const context = this._ensureContext();
		if (!context) return false;
		if (context.state === 'running')
			return options.verifyClock ? this._verifyRunningClock(context, 'resume') : true;
		try {
			const operation = context.resume();
			return await this._finishResume(context, operation, 'resume', !!options.verifyClock);
		} catch (error) {
			this.onTrace('context-resume-error', { reason: 'resume', message: String(error) });
			return false;
		}
	}

	async suspend() {
		const context = this.context;
		if (!context || context.state !== 'running') return;
		const token = this._expectIntentionalSuspend(context);
		try {
			const result = await bounded(context.suspend(), this.contextOperationTimeoutMs);
			if (result === TIMED_OUT) {
				// If the native operation lands after our lifecycle correction, its
				// eventual state event must be visible instead of being mistaken for a
				// completed intentional suspend and silently consumed.
				if (this.intentionalSuspend === token) this._clearIntentionalSuspend();
				this.onTrace('context-suspend-timeout');
			}
		} catch (error) {
			if (this.intentionalSuspend === token) this._clearIntentionalSuspend();
			this.onTrace('context-suspend-error', { message: String(error) });
		}
	}

	setMuted(/** @type {boolean} */ muted) {
		this.muted = !!muted;
		const context = this.context;
		const gain = this.masterGain?.gain;
		if (!context || !gain) return;
		const now = context.currentTime;
		holdParam(gain, now, gain.value);
		gain.linearRampToValueAtTime(this.muted ? 0 : 1, now + 0.025);
	}

	activeCue() {
		return this.activeMusic?.cueKey ?? '';
	}

	activeTrack() {
		return this.activeMusic?.track ?? '';
	}

	/** @param {string} track */
	async prepareMusic(track) {
		const asset = MUSIC_ASSETS[/** @type {keyof typeof MUSIC_ASSETS} */ (track)];
		if (!asset) return false;
		const bytes = await this._load(`music:${track}`, asset.path);
		if (!bytes) return false;
		if (!this.context) return true;
		return Boolean(await this._decode(`music:${track}`, bytes));
	}

	/** @param {string} id */
	async prepareSfx(id) {
		const path = SFX_ASSETS[/** @type {keyof typeof SFX_ASSETS} */ (id)];
		if (!path) return null;
		const bytes = await this._load(`sfx:${id}`, path);
		if (!bytes || !this.context) return null;
		return this._decode(`sfx:${id}`, bytes);
	}

	/** @param {string} key @param {string} path */
	async _load(key, path) {
		const cached = this.encoded.get(key);
		if (cached) return cached;
		const pending = this.pendingFetches.get(key);
		if (pending) return pending;
		if (this.disposed || typeof fetch === 'undefined') return null;
		const controller = new AbortController();
		this.fetchControllers.add(controller);
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		const request = fetch(path, { signal: controller.signal, cache: 'force-cache' })
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.arrayBuffer();
			})
			.then((bytes) => {
				if (!this.disposed) this.encoded.set(key, bytes);
				return bytes;
			})
			.catch((error) => {
				this.onTrace('asset-load-error', { key, message: String(error) });
				return null;
			})
			.finally(() => {
				clearTimeout(timer);
				this.fetchControllers.delete(controller);
				if (this.pendingFetches.get(key) === request) this.pendingFetches.delete(key);
			});
		this.pendingFetches.set(key, request);
		return request;
	}

	/** @param {string} key @param {ArrayBuffer} bytes */
	async _decode(key, bytes) {
		const context = this.context;
		if (!context || context.state === 'closed') return null;
		const cached = this.decoded.get(key);
		if (cached?.generation === this.generation) return cached.buffer;
		const pending = this.pendingDecodes.get(key);
		if (pending) return pending;
		const generation = this.generation;
		const traceDecode = this.onTrace;
		const decoding = new Promise((resolve) => {
			let settled = false;
			const finish = (/** @type {AudioBuffer | null} */ buffer, failed = false) => {
				if (settled) return;
				settled = true;
				if (failed) traceDecode('asset-decode-error', { key });
				resolve(buffer);
			};
			try {
				const maybePromise = context.decodeAudioData(
					bytes.slice(0),
					(buffer) => finish(buffer),
					() => finish(null, true)
				);
				if (maybePromise?.then) maybePromise.then(finish, () => finish(null, true));
			} catch {
				finish(null, true);
			}
		});
		const request = bounded(decoding, this.decodeTimeoutMs)
			.then((buffer) => {
				if (buffer === TIMED_OUT) {
					this.onTrace('asset-decode-timeout', { key });
					return null;
				}
				if (buffer && !this.disposed && generation === this.generation)
					this.decoded.set(key, { generation, buffer });
				return generation === this.generation ? buffer : null;
			})
			.finally(() => {
				if (this.pendingDecodes.get(key) === request) this.pendingDecodes.delete(key);
			});
		this.pendingDecodes.set(key, request);
		return request;
	}

	_schedulePreload() {
		if (this.preloadScheduled || this.disposed) return;
		this.preloadScheduled = true;
		for (const id of CORE_SFX) void this.prepareSfx(id);
		const remaining = Object.keys(SFX_ASSETS).filter((id) => !CORE_SFX.includes(id));
		const preload = () => {
			// Cache compressed bytes without retaining every decoded music track on
			// memory-constrained phones. A cue is decoded only when selected.
			for (const id of remaining) {
				const path = SFX_ASSETS[/** @type {keyof typeof SFX_ASSETS} */ (id)];
				void this._load(`sfx:${id}`, path);
			}
			for (const track of Object.keys(MUSIC_ASSETS)) {
				const asset = MUSIC_ASSETS[/** @type {keyof typeof MUSIC_ASSETS} */ (track)];
				void this._load(`music:${track}`, asset.path);
			}
		};
		if (typeof window !== 'undefined' && 'requestIdleCallback' in window)
			window.requestIdleCallback(preload, { timeout: 2500 });
		else setTimeout(preload, 400);
	}

	_effectiveDuck() {
		return Math.min(1, ...this.ducks.values());
	}

	/** @param {unknown} key @param {number} amount */
	setDuck(key, amount) {
		this.ducks.set(key, Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 1);
		this._updateMusicGain();
	}

	/** @param {unknown} key */
	clearDuck(key) {
		this.ducks.delete(key);
		this._updateMusicGain();
	}

	/**
	 * Applies the equalizer answer to the music bus. Safe to call with no
	 * context, no music playing, or sound switched off: the gains are stored
	 * either way and _ensureContext seeds the filters from them, so an answer
	 * given before the first gesture is honoured the moment audio unlocks.
	 *
	 * The curve is applied raw — no makeup gain, no partial blend. A maxed EQ is
	 * meant to sound maxed; the limiter downstream is what keeps that from
	 * becoming an actual clipping blast.
	 *
	 * @param {number[]} gainsDb @param {number} [rampMs]
	 */
	setMusicEq(gainsDb, rampMs = 400) {
		if (this.disposed) return;
		const gains = Array.isArray(gainsDb) ? gainsDb : [];
		this.eqGains = MUSIC_EQ_BANDS.map((_, index) => clampEqGain(gains[index]));
		this.onTrace('music-eq', { gains: this.eqGains });

		const context = this.context;
		const nodes = this.eqNodes;
		if (!context || !nodes) return;
		const now = context.currentTime;
		const seconds = Math.max(0, Number(rampMs) || 0) / 1000;
		nodes.forEach((filter, index) => {
			const target = this.eqGains[index];
			const param = filter.gain;
			holdParam(param, now, param.value);
			if (seconds <= 0) param.setValueAtTime(target, now);
			else param.linearRampToValueAtTime(target, now + seconds);
		});
	}

	/** @param {number} [duration] */
	_updateMusicGain(duration = 0.12) {
		const voice = this.activeMusic;
		const context = this.context;
		if (!voice || !context) return;
		const target = musicVolume(voice.track, voice.targetRate, this._effectiveDuck());
		const now = context.currentTime;
		holdParam(voice.gain.gain, now, voice.gain.gain.value);
		if (duration <= 0) voice.gain.gain.setValueAtTime(target, now);
		else voice.gain.gain.linearRampToValueAtTime(target, now + duration);
	}

	/** @param {any} voice @param {number} now */
	_rateAt(voice, now) {
		const ramp = voice.ramp;
		if (!ramp || now >= ramp.end) return voice.targetRate;
		if (now <= ramp.start || ramp.from === ramp.to) return ramp.from;
		const progress = (now - ramp.start) / (ramp.end - ramp.start);
		return ramp.from * Math.pow(ramp.to / ramp.from, progress);
	}

	/** @param {any} voice @param {number} now */
	_positionAt(voice, now) {
		const elapsed = Math.max(0, now - voice.anchorTime);
		const ramp = voice.ramp;
		if (!ramp) return voice.anchorPosition + elapsed * voice.targetRate;
		const rampDuration = ramp.end - ramp.start;
		const during = Math.min(elapsed, rampDuration);
		let rampDistance;
		if (ramp.from === ramp.to) rampDistance = ramp.from * during;
		else {
			const k = Math.log(ramp.to / ramp.from) / rampDuration;
			rampDistance = (ramp.from * (Math.exp(k * during) - 1)) / k;
		}
		return (
			voice.anchorPosition +
			rampDistance +
			Math.max(0, elapsed - rampDuration) * ramp.to
		);
	}

	position() {
		const voice = this.activeMusic;
		const context = this.context;
		if (!voice || !context) return this.lastPosition;
		const position = this._positionAt(voice, context.currentTime);
		if (voice.loop && voice.duration > 0) return position % voice.duration;
		return position;
	}

	/** @param {string} rate @param {number} rampMs */
	setMusicRate(rate, rampMs) {
		const voice = this.activeMusic;
		const context = this.context;
		if (!voice || !context || !voice.rateSensitive) return;
		const target = rateValue(rate);
		// Reconciliation can revisit an already-owned cue. Re-scheduling the same
		// endpoint here would restart an in-flight one-second ramp indefinitely.
		if (voice.targetRate === target) return;
		const now = context.currentTime;
		const currentRate = this._rateAt(voice, now);
		const currentPosition = this._positionAt(voice, now);
		const seconds = Math.max(0, Number(rampMs) || 0) / 1000;
		voice.anchorPosition = currentPosition;
		voice.anchorTime = now;
		voice.targetRate = target;
		voice.ramp = seconds > 0 ? { start: now, end: now + seconds, from: currentRate, to: target } : null;
		scheduleMusicRate(voice.source.playbackRate, target, now, seconds, currentRate);
		this._updateMusicGain(0.2);
		this.onTrace('music-rate', { cueKey: voice.cueKey, rate, seconds });
	}

	/**
	 * @param {string} track
	 * @param {{ cueKey: string, rate: string, startOffset: number, fadeMs: number }} options
	 */
	async startMusic(track, options) {
		if (this.musicStop) await this.musicStop;
		if (this.activeMusic) await this.stopMusic(0);
		const context = this.context;
		const bus = this.musicBus;
		const asset = MUSIC_ASSETS[/** @type {keyof typeof MUSIC_ASSETS} */ (track)];
		const buffer = this.decoded.get(`music:${track}`)?.buffer;
		if (!context || context.state !== 'running' || !bus || !asset || !buffer) return 'failed';
		let offset = Math.max(0, Number(options.startOffset) || 0);
		if (!asset.loop && offset >= buffer.duration) return 'ended';
		if (asset.loop && buffer.duration > 0) offset %= buffer.duration;

		const source = context.createBufferSource();
		const gain = context.createGain();
		const targetRate = asset.rateSensitive ? rateValue(options.rate) : 1;
		const targetGain = musicVolume(
			/** @type {'default' | 'asteroid' | 'report'} */ (track),
			targetRate,
			this._effectiveDuck()
		);
		const now = context.currentTime;
		source.buffer = buffer;
		source.loop = asset.loop;
		source.playbackRate.value = targetRate;
		gain.gain.value = 0;
		source.connect(gain);
		gain.connect(bus);
		const voice = {
			track,
			cueKey: options.cueKey,
			source,
			gain,
			loop: asset.loop,
			rateSensitive: asset.rateSensitive,
			duration: buffer.duration,
			anchorPosition: offset,
			anchorTime: now,
			targetRate,
			ramp: null,
			stopped: false,
			cleaned: false
		};
		const cleanup = () => {
			if (voice.cleaned) return;
			voice.cleaned = true;
			safeDisconnect(source);
			safeDisconnect(gain);
		};
		source.onended = () => {
			const natural = !voice.stopped && this.activeMusic === voice;
			if (this.activeMusic === voice) {
				this.lastPosition = this._positionAt(voice, context.currentTime);
				this.activeMusic = null;
			}
			cleanup();
			if (natural) this.handlers.onNaturalEnd(voice.cueKey);
		};
		try {
			source.start(0, offset);
		} catch (error) {
			voice.stopped = true;
			cleanup();
			this.onTrace('music-start-error', { track, message: String(error) });
			return 'failed';
		}
		this.activeMusic = voice;
		this.lastPosition = offset;
		for (const key of this.decoded.keys()) {
			if (key.startsWith('music:') && key !== `music:${track}`) this.decoded.delete(key);
		}
		gain.gain.setValueAtTime(0, now);
		const fadeSeconds = Math.max(0, Number(options.fadeMs) || 0) / 1000;
		if (fadeSeconds === 0) gain.gain.setValueAtTime(targetGain, now);
		else gain.gain.linearRampToValueAtTime(targetGain, now + fadeSeconds);
		this.onTrace('music-start', { track, cueKey: options.cueKey, offset });
		return 'playing';
	}

	_cancelMusicStop() {
		this.musicStopAbort?.abort();
		const voice = this.stoppingMusic;
		if (!voice) return;
		voice.stopped = true;
		voice.source.onended = null;
		safeStop(voice.source);
		safeDisconnect(voice.source);
		safeDisconnect(voice.gain);
		this.stoppingMusic = null;
	}

	/** @param {number} fadeMs */
	async stopMusic(fadeMs) {
		if (this.musicStop) await this.musicStop;
		const voice = this.activeMusic;
		if (!voice) return;
		this.activeMusic = null;
		voice.stopped = true;
		const context = this.context;
		this.lastPosition = context ? this._positionAt(voice, context.currentTime) : this.lastPosition;
		const duration = Math.max(0, Number(fadeMs) || 0);
		const abort = new AbortController();
		const operation = (async () => {
			if (context && duration > 0) {
				const now = context.currentTime;
				holdParam(voice.gain.gain, now, voice.gain.gain.value);
				voice.gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
				await wait(duration, abort.signal);
			}
			voice.source.onended = null;
			safeStop(voice.source);
			safeDisconnect(voice.source);
			safeDisconnect(voice.gain);
			this.onTrace('music-stop', { track: voice.track, cueKey: voice.cueKey, fadeMs: duration });
		})();
		this.musicStop = operation;
		this.musicStopAbort = abort;
		this.stoppingMusic = voice;
		try {
			await operation;
		} finally {
			if (this.musicStop === operation) {
				this.musicStop = null;
				this.musicStopAbort = null;
			}
			if (this.stoppingMusic === voice) this.stoppingMusic = null;
		}
	}

	/** @param {any} token */
	_registerSfx(token) {
		this.pendingSfx.add(token);
		if (token.tag) {
			this.stopSfx(token.tag);
			this.taggedSfx.set(token.tag, token);
		}
		if (token.scope) {
			let tokens = this.scopedSfx.get(token.scope);
			if (!tokens) this.scopedSfx.set(token.scope, (tokens = new Set()));
			tokens.add(token);
		}
	}

	/** @param {any} token */
	_forgetSfx(token) {
		this.pendingSfx.delete(token);
		if (token.tag && this.taggedSfx.get(token.tag) === token) this.taggedSfx.delete(token.tag);
		if (token.scope) {
			const tokens = this.scopedSfx.get(token.scope);
			tokens?.delete(token);
			if (tokens?.size === 0) this.scopedSfx.delete(token.scope);
		}
	}

	/** @param {any} token */
	_stopSfxToken(token) {
		token.cancelled = true;
		token.cancellation?.resolve();
		if (token.voice) {
			this.sfxVoices.delete(token.voice);
			token.voice.source.onended = null;
			safeStop(token.voice.source);
			safeDisconnect(token.voice.source);
			safeDisconnect(token.voice.gain);
		}
		this._forgetSfx(token);
	}

	/** @param {string} tag */
	stopSfx(tag) {
		const token = this.taggedSfx.get(tag);
		if (token) this._stopSfxToken(token);
	}

	/** @param {string} scope */
	stopSfxScope(scope) {
		for (const token of [...(this.scopedSfx.get(scope) ?? [])]) this._stopSfxToken(token);
	}

	stopAllSfx() {
		for (const token of [...this.pendingSfx]) this._stopSfxToken(token);
		for (const voice of [...this.sfxVoices]) this._stopSfxToken(voice.token);
	}

	/**
	 * @param {string} id
	 * @param {{ volume?: number, rate?: number, tag?: string, scope?: string, maxLatencyMs?: number }} [options]
	 */
	async playSfx(id, options = {}) {
		if (
			this.disposed ||
			this.muted ||
			!SFX_ASSETS[/** @type {keyof typeof SFX_ASSETS} */ (id)]
		)
			return null;
		const beganAt = monotonicNow();
		const token = /** @type {any} */ ({
			id,
			tag: options.tag || '',
			scope: options.scope || '',
			cancelled: false,
			cancellation: cancellationDeferred(),
			voice: null
		});
		this._registerSfx(token);
		/** @param {Promise<unknown>} operation */
		const whileCurrent = (operation) =>
			Promise.race([
				operation.then(
					(value) => ({ kind: 'value', value }),
					(error) => ({ kind: 'error', error })
				),
				token.cancellation.promise.then(() => ({ kind: 'cancelled', value: null }))
			]);
		const resumed = await whileCurrent(this.resume());
		if (resumed.kind !== 'value' || !resumed.value || token.cancelled) {
			if (resumed.kind === 'error')
				this.onTrace('sfx-resume-error', { id, message: String(resumed.error) });
			this._forgetSfx(token);
			return null;
		}
		const prepared = await whileCurrent(this.prepareSfx(id));
		if (prepared.kind === 'error')
			this.onTrace('sfx-prepare-error', { id, message: String(prepared.error) });
		const buffer = prepared.kind === 'value' ? prepared.value : null;
		const maxLatency = Number.isFinite(options.maxLatencyMs)
			? Math.max(0, Number(options.maxLatencyMs))
			: Number.POSITIVE_INFINITY;
		if (
			!buffer ||
			token.cancelled ||
			this.muted ||
			monotonicNow() - beganAt > maxLatency ||
			!this.context ||
			this.context.state !== 'running' ||
			!this.sfxBus
		) {
			this._forgetSfx(token);
			return null;
		}

		const sameId = [...this.sfxVoices]
			.filter((voice) => voice.id === id)
			.sort((a, b) => a.startedAt - b.startedAt);
		const perSoundLimit = id === 'slider-detent' ? 3 : 6;
		while (sameId.length >= perSoundLimit) this._stopSfxToken(sameId.shift().token);
		while (this.sfxVoices.size >= MAX_SFX_VOICES) {
			const oldest = [...this.sfxVoices].sort((a, b) => a.startedAt - b.startedAt)[0];
			if (!oldest) break;
			this._stopSfxToken(oldest.token);
		}

		const source = this.context.createBufferSource();
		const gain = this.context.createGain();
		source.buffer = buffer;
		source.playbackRate.value = normalizeSfxRate(options.rate);
		gain.gain.value = normalizeSfxVolume(options.volume);
		source.connect(gain);
		gain.connect(this.sfxBus);
		const voice = { id, source, gain, token, startedAt: monotonicNow() };
		token.voice = voice;
		this.pendingSfx.delete(token);
		this.sfxVoices.add(voice);
		source.onended = () => {
			this.sfxVoices.delete(voice);
			safeDisconnect(source);
			safeDisconnect(gain);
			this._forgetSfx(token);
		};
		try {
			source.start();
			return source;
		} catch (error) {
			this.onTrace('sfx-start-error', { id, message: String(error) });
			this._stopSfxToken(token);
			return null;
		}
	}

	playReaderTick() {
		const context = this.context;
		if (this.disposed || this.muted || !context || context.state !== 'running' || !this.sfxBus)
			return;
		const now = context.currentTime;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = 'sine';
		oscillator.frequency.value = 880;
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(0.036, now + 0.002);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
		oscillator.connect(gain);
		gain.connect(this.sfxBus);
		oscillator.onended = () => {
			safeDisconnect(oscillator);
			safeDisconnect(gain);
		};
		oscillator.start(now);
		oscillator.stop(now + 0.02);
	}

	async recover() {
		if (this.disposed) return false;
		const oldContext = this.context;
		this._clearIntentionalSuspend();
		this._cancelMusicStop();
		if (oldContext && this.contextListener)
			oldContext.removeEventListener('statechange', this.contextListener);
		if (this.activeMusic) {
			this.activeMusic.stopped = true;
			this.activeMusic.source.onended = null;
			safeStop(this.activeMusic.source);
			safeDisconnect(this.activeMusic.source);
			safeDisconnect(this.activeMusic.gain);
			this.activeMusic = null;
		}
		this.stopAllSfx();
		this.decoded.clear();
		this.pendingDecodes.clear();
		this.preloadScheduled = false;
		safeDisconnect(this.musicBus);
		for (const filter of this.eqNodes ?? []) safeDisconnect(filter);
		safeDisconnect(this.sfxBus);
		safeDisconnect(this.limiter);
		safeDisconnect(this.masterGain);
		this.context = null;
		this.masterGain = null;
		this.musicBus = null;
		this.sfxBus = null;
		this.limiter = null;
		// eqNodes belong to the dead context; eqGains do not. Keeping the gains
		// is what makes the taker's answer survive a recovery rebuild.
		this.eqNodes = null;
		this.contextListener = null;
		const closing = oldContext ? this._closeContext(oldContext, 'recovery') : Promise.resolve(true);

		// Initiate the replacement context and resume before yielding the gesture.
		const context = this._ensureContext();
		if (!context) return false;
		let resumed;
		try {
			resumed = context.state === 'running' ? Promise.resolve() : context.resume();
		} catch (error) {
			this.onTrace('context-resume-error', { reason: 'recovery', message: String(error) });
			this._pulse(context);
			return false;
		}
		this._pulse(context);
		void closing;
		const running = await this._finishResume(context, resumed, 'recovery', true);
		if (running) this._schedulePreload();
		return running;
	}

	async dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.generation += 1;
		this._clearIntentionalSuspend();
		for (const controller of this.fetchControllers) controller.abort();
		this.fetchControllers.clear();
		const stopping = this.musicStop;
		this._cancelMusicStop();
		if (this.activeMusic) {
			this.activeMusic.stopped = true;
			this.activeMusic.source.onended = null;
			safeStop(this.activeMusic.source);
			safeDisconnect(this.activeMusic.source);
			safeDisconnect(this.activeMusic.gain);
			this.activeMusic = null;
		}
		this.stopAllSfx();
		const context = this.context;
		if (context && this.contextListener)
			context.removeEventListener('statechange', this.contextListener);
		if (this.session && this.sessionListener)
			/** @type {any} */ (this.session).removeEventListener?.('statechange', this.sessionListener);
		safeDisconnect(this.musicBus);
		for (const filter of this.eqNodes ?? []) safeDisconnect(filter);
		safeDisconnect(this.sfxBus);
		safeDisconnect(this.limiter);
		safeDisconnect(this.masterGain);
		this.context = null;
		this.masterGain = null;
		this.musicBus = null;
		this.sfxBus = null;
		this.limiter = null;
		this.eqNodes = null;
		this.contextListener = null;
		this.session = null;
		this.sessionListener = null;
		this.preloadScheduled = false;
		this.encoded.clear();
		this.pendingFetches.clear();
		this.decoded.clear();
		this.pendingDecodes.clear();
		this.pendingSfx.clear();
		this.sfxVoices.clear();
		this.taggedSfx.clear();
		this.scopedSfx.clear();
		this.ducks.clear();
		this.handlers = {
			onContextState: () => {},
			onContextRunning: () => {},
			onSessionActive: () => {},
			onNaturalEnd: () => {}
		};
		const closing = context ? this._closeContext(context, 'dispose') : Promise.resolve(true);
		if (stopping) await bounded(stopping, this.contextOperationTimeoutMs).catch(() => TIMED_OUT);
		await closing;
		this.musicStop = null;
		this.musicStopAbort = null;
		this.stoppingMusic = null;
	}
}
