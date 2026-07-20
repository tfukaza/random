/**
 * Pure latest-intent coordinator. It knows nothing about the DOM or Web Audio;
 * the injected transport owns those details. Keeping every asynchronous
 * boundary here makes the music state machine deterministic in Node tests.
 */

/** @typedef {'slow' | 'normal' | 'fast'} MusicRate */
/** @typedef {'playing' | 'silent' | 'superseded' | 'failed'} StartOutcome */

/** @returns {{ promise: Promise<StartOutcome>, resolve: (value: StartOutcome) => void }} */
function outcomeDeferred() {
	/** @type {(value: StartOutcome) => void} */
	let resolve = () => {};
	const promise = new Promise((done) => (resolve = done));
	return { promise, resolve };
}

/** @returns {{ promise: Promise<void>, resolve: () => void }} */
function signalDeferred() {
	/** @type {() => void} */
	let resolve = () => {};
	/** @type {Promise<void>} */
	const promise = new Promise((done) => (resolve = () => done(undefined)));
	return { promise, resolve };
}

/** @param {unknown} value @returns {MusicRate} */
export function musicRateMode(value) {
	if (value === 'slow' || (typeof value === 'number' && value < 0.5)) return 'slow';
	if (value === 'fast' || (typeof value === 'number' && value >= 4)) return 'fast';
	return 'normal';
}

/**
 * @typedef {{
 *   setMuted: (muted: boolean) => void,
 *   activate: () => Promise<boolean>,
 *   prepareMusic: (track: string) => Promise<boolean>,
 *   activeCue: () => string,
 *   activeTrack: () => string,
 *   stopMusic: (fadeMs: number) => Promise<void>,
 *   startMusic: (track: string, options: { cueKey: string, rate: MusicRate, startOffset: number, fadeMs: number }) => Promise<'playing' | 'ended' | 'failed'>,
 *   setMusicRate: (rate: MusicRate, rampMs: number) => void,
 *   suspend: () => Promise<void>,
 *   resume: (options?: { verifyClock?: boolean }) => Promise<boolean>,
 *   recover: () => Promise<boolean>,
 *   position: () => number,
 *   dispose: () => Promise<void>
 * }} MusicTransport
 */

/**
 * @typedef {{
 *   kind: 'track', revision: number, track: string, cueKey: string,
 *   rate: MusicRate, startOffset: number, restart: boolean, fadeMs: number,
 *   rampMs: number, completed: boolean
 * } | { kind: 'silence', revision: number, cueKey: string, fadeMs: number }} MusicIntent
 */

export class AudioCoordinator {
	/**
	 * @param {{
	 *   transport: MusicTransport,
	 *   enabled?: boolean,
	 *   onState?: (patch: Record<string, unknown>) => void,
	 *   onTrace?: (event: string, detail?: Record<string, unknown>) => void
	 * }} options
	 */
	constructor({ transport, enabled = true, onState = () => {}, onTrace = () => {} }) {
		this.transport = transport;
		this.onState = onState;
		this.onTrace = onTrace;
		this.enabled = enabled;
		this.started = false;
		this.revision = 0;
		/** @type {MusicIntent} */
		this.intent = { kind: 'silence', revision: 0, cueKey: 'initial-silence', fadeMs: 0 };
		/** @type {{ cueKey: string, revision: number, whenStarted: Promise<StartOutcome>, stop: () => unknown, settled: boolean, settle: (outcome: StartOutcome) => void }} */
		this.request = this.#makeRequest(this.intent);
		this.request.settle('silent');
		this.reconciling = false;
		this.reconcileAgain = false;
		this.intentChanged = signalDeferred();
		this.activationAttempt = 0;
		this.resumeAttempt = 0;
		this.recoveryAttempt = 0;
		this.suspendAttempt = 0;
		this.suspended = false;
		this.disposed = false;
	}

	/** @param {MusicIntent} intent */
	#makeRequest(intent) {
		const deferred = outcomeDeferred();
		const request = {
			cueKey: intent.cueKey,
			revision: intent.revision,
			whenStarted: deferred.promise,
			settled: false,
			/** @param {StartOutcome} outcome */
			settle(outcome) {
				if (request.settled) return;
				request.settled = true;
				deferred.resolve(outcome);
			},
			// A handle only owns the intent that created it. An old component must
			// never be able to silence a newer scene after it unmounts.
			stop: () => (this.request === request ? this.stop() : this.request)
		};
		return request;
	}

	/** @param {MusicIntent} intent */
	#install(intent) {
		this.intentChanged.resolve();
		this.intentChanged = signalDeferred();
		if (!this.request.settled) this.request.settle('superseded');
		this.intent = intent;
		this.request = this.#makeRequest(intent);
		this.onTrace('intent', { revision: intent.revision, kind: intent.kind, cueKey: intent.cueKey });
		this.#schedule();
		return this.request;
	}

	#invalidateWork() {
		this.intentChanged.resolve();
		this.intentChanged = signalDeferred();
	}

	/**
	 * @param {string} track
	 * @param {{ cueKey?: string, rate?: MusicRate | number, startOffset?: number, restart?: boolean, transition?: { ms?: number } | 'cut' }} [options]
	 */
	play(track, options = {}) {
		const rate = musicRateMode(options.rate);
		const cueKey = options.cueKey || `${track}:${this.revision + 1}`;
		const startOffset = Number.isFinite(options.startOffset)
			? Math.max(0, Number(options.startOffset))
			: 0;
		const fadeMs = options.transition === 'cut'
			? 0
			: Math.max(0, Number(options.transition?.ms ?? 140));
		const sameCue =
			this.intent.kind === 'track' &&
			this.intent.track === track &&
			this.intent.cueKey === cueKey &&
			!options.restart &&
			this.intent.startOffset === startOffset;
		if (sameCue) {
			if (this.intent.kind === 'track' && this.intent.rate !== rate)
				return this.setRate(rate, { rampMs: 1000 });
			return this.request;
		}

		const revision = ++this.revision;
		this.onState({
			revision,
			requestedTrack: track,
			cueKey,
			rate,
			status: this.started && this.enabled ? 'loading' : this.enabled ? 'locked' : 'silent',
			errorCategory: ''
		});
		return this.#install({
			kind: 'track',
			revision,
			track,
			cueKey,
			rate,
			startOffset,
			restart: !!options.restart,
			fadeMs,
			rampMs: 0,
			completed: false
		});
	}

	/** @param {{ transition?: { ms?: number } | 'cut' }} [options] */
	stop(options = {}) {
		const revision = ++this.revision;
		const fadeMs = options.transition === 'cut'
			? 0
			: Math.max(0, Number(options.transition?.ms ?? 140));
		const cueKey = `silence:${revision}`;
		this.onState({ revision, requestedTrack: '', cueKey, status: 'loading', errorCategory: '' });
		return this.#install({ kind: 'silence', revision, cueKey, fadeMs });
	}

	/** @param {MusicRate | number} rate @param {{ rampMs?: number }} [options] */
	setRate(rate, options = {}) {
		const normalized = musicRateMode(rate);
		if (this.intent.kind !== 'track') {
			this.onState({ rate: normalized });
			return this.request;
		}
		if (this.intent.rate === normalized) return this.request;
		const revision = ++this.revision;
		this.onState({ revision, rate: normalized, status: this.enabled ? 'loading' : 'silent' });
		const request = this.#install({
			...this.intent,
			revision,
			rate: normalized,
			rampMs: Math.max(0, Number(options.rampMs ?? 1000))
		});
		return request;
	}

	/** @param {boolean} enabled */
	setEnabled(enabled) {
		this.activationAttempt += 1;
		this.resumeAttempt += 1;
		this.recoveryAttempt += 1;
		this.enabled = !!enabled;
		if (!this.enabled) this.transport.setMuted(true);
		else {
			const canRevealCurrentGraph =
				this.intent.kind === 'silence' ||
				(this.intent.kind === 'track' && this.intent.completed) ||
				!this.transport.activeCue() ||
				(this.intent.kind === 'track' &&
					this.transport.activeCue() === this.intent.cueKey &&
					this.transport.activeTrack() === this.intent.track);
			if (canRevealCurrentGraph) this.transport.setMuted(false);
		}
		const revision = ++this.revision;
		this.#invalidateWork();
		this.intent = { ...this.intent, revision };
		if (!this.request.settled) this.request.settle(this.enabled ? 'superseded' : 'silent');
		this.request = this.#makeRequest(this.intent);
		this.onState({
			enabled: this.enabled,
			revision,
			status: this.enabled ? (this.started ? 'loading' : 'locked') : 'silent'
		});
		if (!this.enabled) this.request.settle('silent');
		this.#schedule();
		return this.request;
	}

	/** Fetch encoded music early and decode it once a context exists. @param {string} track */
	async prepareMusic(track) {
		try {
			return await this.transport.prepareMusic(track);
		} catch (error) {
			this.onTrace('prepare-error', { track, message: String(error) });
			return false;
		}
	}

	async activateFromGesture() {
		if (this.disposed) return /** @type {StartOutcome} */ ('failed');
		const attempt = ++this.activationAttempt;
		this.suspendAttempt += 1;
		this.suspended = false;
		this.started = true;
		this.onState({ started: true });
		if (!this.enabled) return /** @type {StartOutcome} */ ('silent');
		let running = false;
		try {
			running = await this.transport.activate();
		} catch (error) {
			this.onTrace('activation-error', { message: String(error) });
		}
		if (attempt !== this.activationAttempt || this.disposed) return this.request.whenStarted;
		if (!running) {
			this.suspended = true;
			this.onState({ status: 'locked', interruptionReason: 'activation' });
			return /** @type {StartOutcome} */ ('failed');
		}
		this.onState({ status: 'loading', interruptionReason: '' });
		this.#schedule();
		return this.request.whenStarted;
	}

	async resume() {
		if (!this.enabled || !this.started || this.disposed) return false;
		const attempt = ++this.resumeAttempt;
		this.suspendAttempt += 1;
		this.suspended = false;
		let running = false;
		try {
			running = await this.transport.resume({ verifyClock: true });
		} catch (error) {
			this.onTrace('resume-error', { message: String(error) });
		}
		if (attempt !== this.resumeAttempt || this.disposed) return false;
		if (!running) {
			this.suspended = true;
			this.onState({ status: 'recoverable', interruptionReason: 'resume' });
			return false;
		}
		this.onState({ status: 'loading', interruptionReason: '' });
		this.#schedule();
		return true;
	}

	async suspend() {
		if (!this.started || this.disposed) return;
		const attempt = ++this.suspendAttempt;
		this.suspended = true;
		this.#invalidateWork();
		if (this.enabled)
			this.onState({ status: 'interrupted', interruptionReason: 'visibility' });
		try {
			await this.transport.suspend();
		} catch (error) {
			this.onTrace('suspend-error', { message: String(error) });
		}
		if (attempt === this.suspendAttempt || this.disposed || this.suspended) return;
		// A quick foreground transition can ask for resume while the older native
		// suspend is still pending. If that suspend lands last, actively restore
		// the newer lifecycle intent instead of leaving a nominally playing quiz
		// on a suspended context.
		let running = false;
		try {
			running = await this.transport.resume({ verifyClock: true });
		} catch (error) {
			this.onTrace('stale-suspend-resume-error', { message: String(error) });
		}
		if (this.disposed || this.suspended) return;
		if (!running) {
			this.suspended = true;
			this.onState({ status: 'recoverable', interruptionReason: 'resume' });
			return;
		}
		this.onState({ status: 'loading', interruptionReason: '' });
		this.#schedule();
	}

	/** @param {string} [reason] */
	markInterrupted(reason = 'platform') {
		this.suspendAttempt += 1;
		this.suspended = true;
		this.#invalidateWork();
		if (this.enabled && this.started)
			this.onState({ status: 'interrupted', interruptionReason: reason });
	}

	async recoverFromGesture() {
		if (this.disposed || !this.enabled) return /** @type {StartOutcome} */ ('silent');
		this.activationAttempt += 1;
		this.resumeAttempt += 1;
		this.suspendAttempt += 1;
		this.suspended = false;
		const attempt = ++this.recoveryAttempt;
		const startingRevision = this.intent.revision;
		this.started = true;
		let startOffset =
			this.intent.kind === 'track' && this.transport.activeTrack() === this.intent.track
				? this.transport.position()
				: this.intent.kind === 'track'
					? this.intent.startOffset
					: 0;
		if (!Number.isFinite(startOffset)) startOffset = 0;
		this.onState({ started: true, status: 'loading', interruptionReason: 'recovery' });
		let recovered = false;
		try {
			recovered = await this.transport.recover();
		} catch (error) {
			this.onTrace('recovery-error', { message: String(error) });
		}
		if (attempt !== this.recoveryAttempt || this.disposed) return this.request.whenStarted;
		if (!recovered) {
			this.suspended = true;
			this.onState({ status: 'recoverable', errorCategory: 'context-recovery' });
			return /** @type {StartOutcome} */ ('failed');
		}
		// A navigation or state transition that landed during graph reconstruction
		// already owns the next intent. Never overwrite it with the old position.
		if (startingRevision !== this.intent.revision) {
			this.#schedule();
			return this.request.whenStarted;
		}
		const revision = ++this.revision;
		this.intent =
			this.intent.kind === 'track'
				? {
						...this.intent,
						revision,
						startOffset,
						restart: !this.intent.completed
					}
				: { ...this.intent, revision };
		this.#invalidateWork();
		// A scene such as Q50 may still be waiting on the original handle. Preserve
		// that promise across recovery so its clock cannot deadlock on superseded.
		if (this.request.settled) this.request = this.#makeRequest(this.intent);
		else this.request.revision = revision;
		this.onState({
			revision,
			started: true,
			status: 'loading',
			errorCategory: '',
			interruptionReason: 'recovery'
		});
		this.#schedule();
		return this.request.whenStarted;
	}

	#schedule() {
		if (this.disposed) return;
		if (this.reconciling) {
			this.reconcileAgain = true;
			return;
		}
		this.reconciling = true;
		queueMicrotask(() => void this.#run());
	}

	async #run() {
		try {
			do {
				this.reconcileAgain = false;
				const snapshot = this.intent;
				await this.#reconcile(snapshot);
				if (snapshot.revision !== this.intent.revision) this.reconcileAgain = true;
			} while (this.reconcileAgain && !this.disposed);
		} catch (error) {
			// No transport failure may escape the unawaited reconciliation task.
			this.onTrace('coordinator-error', { message: String(error) });
			if (!this.disposed) {
				this.onState({ status: 'error', errorCategory: 'transport' });
				this.request.settle('failed');
			}
		} finally {
			this.reconciling = false;
			if (this.reconcileAgain && !this.disposed) this.#schedule();
		}
	}

	/** @param {MusicIntent} intent */
	async #reconcile(intent) {
		const current = () => !this.disposed && intent.revision === this.intent.revision;
		const changed = this.intentChanged.promise;
		/** @param {() => unknown} operation */
		const step = async (operation) =>
			Promise.race([
				Promise.resolve()
					.then(operation)
					.then(
						(value) => ({ kind: 'value', value }),
						(error) => ({ kind: 'error', error })
					),
				changed.then(() => ({ kind: 'stale' }))
			]);
		/** @param {{ kind: string, error?: unknown }} result */
		const assertStep = (result) => {
			if (result.kind === 'error') throw result.error;
			return result.kind !== 'stale';
		};

		try {
			if (intent.kind === 'silence') {
				const stopped = await step(() => this.transport.stopMusic(intent.fadeMs));
				if (!assertStep(stopped) || !current()) return;
				if (this.enabled) this.transport.setMuted(false);
				this.onState({
					activeTrack: '',
					musicTrack: '',
					ready: false,
					status: 'silent',
					interruptionReason: ''
				});
				this.request.settle('silent');
				return;
			}

			if (!this.enabled) {
				this.transport.setMuted(true);
				if (current()) this.request.settle('silent');
				return;
			}
			if (!this.started) {
				this.onState({ status: 'locked' });
				return;
			}
			if (this.suspended) {
				this.onState({ status: 'interrupted' });
				return;
			}
			if (intent.completed && !intent.restart) {
				this.transport.setMuted(false);
				this.onState({
					activeTrack: '',
					musicTrack: '',
					ready: false,
					status: 'silent',
					interruptionReason: ''
				});
				this.request.settle('silent');
				return;
			}

			const resumed = await step(() => this.transport.resume());
			if (!assertStep(resumed) || !current()) return;
			if (!/** @type {any} */ (resumed).value) {
				this.suspended = true;
				this.onState({ status: 'recoverable', interruptionReason: 'resume' });
				return;
			}

			this.onState({ status: 'loading', errorCategory: '' });
			const prepared = await step(() => this.transport.prepareMusic(intent.track));
			if (!assertStep(prepared) || !current()) return;
			if (!/** @type {any} */ (prepared).value) {
				const stopped = await step(() => this.transport.stopMusic(intent.fadeMs));
				if (!assertStep(stopped) || !current()) return;
				this.transport.setMuted(false);
				this.onState({
					activeTrack: '',
					musicTrack: '',
					ready: false,
					musicFailed: true,
					status: 'error',
					errorCategory: 'asset'
				});
				this.request.settle('failed');
				return;
			}

			const sameCue =
				!intent.restart &&
				this.transport.activeCue() === intent.cueKey &&
				this.transport.activeTrack() === intent.track;
			if (sameCue) {
				this.transport.setMusicRate(intent.rate, intent.rampMs);
				this.transport.setMuted(false);
				this.onState({
					activeTrack: intent.track,
					musicTrack: intent.track,
					ready: true,
					musicFailed: false,
					status: 'playing',
					interruptionReason: ''
				});
				this.request.settle('playing');
				return;
			}

			const stopped = await step(() => this.transport.stopMusic(intent.fadeMs));
			if (!assertStep(stopped) || !current()) return;
			const started = await step(() =>
				this.transport.startMusic(intent.track, {
					cueKey: intent.cueKey,
					rate: intent.rate,
					startOffset: intent.startOffset,
					fadeMs: intent.fadeMs
				})
			);
			if (!assertStep(started)) return;
			if (!current()) {
				await this.transport.stopMusic(0).catch(() => {});
				return;
			}
			const outcome = /** @type {any} */ (started).value;
			if (outcome === 'failed') {
				this.transport.setMuted(false);
				this.onState({ status: 'error', errorCategory: 'start', ready: false, musicFailed: true });
				this.request.settle('failed');
				return;
			}
			if (outcome === 'ended') {
				this.intent = { ...intent, completed: true, restart: false };
				this.transport.setMuted(false);
				this.onState({ activeTrack: '', musicTrack: '', ready: false, status: 'silent' });
				this.request.settle('silent');
				return;
			}
			this.transport.setMuted(false);
			this.onState({
				activeTrack: intent.track,
				musicTrack: intent.track,
				ready: true,
				musicFailed: false,
				status: 'playing',
				interruptionReason: ''
			});
			this.request.settle('playing');
		} catch (error) {
			if (!current()) return;
			this.onTrace('transport-error', { message: String(error), cueKey: intent.cueKey });
			await this.transport.stopMusic(0).catch(() => {});
			if (!current()) return;
			this.transport.setMuted(false);
			this.onState({
				activeTrack: '',
				musicTrack: '',
				ready: false,
				musicFailed: true,
				status: 'error',
				errorCategory: 'transport'
			});
			this.request.settle('failed');
		}
	}

	/** Called by the transport when a finite source reaches its natural end. */
	naturalEnd(/** @type {string} */ cueKey) {
		if (this.intent.kind !== 'track' || this.intent.cueKey !== cueKey) return;
		const revision = ++this.revision;
		this.#invalidateWork();
		this.intent = { ...this.intent, revision, completed: true, restart: false };
		this.request.revision = revision;
		// onended proves that this cue did start, even if a very short remainder
		// finishes before the coordinator's start promise continuation runs.
		this.request.settle('playing');
		this.onTrace('music-ended', { cueKey, revision });
		this.onState({
			revision,
			activeTrack: '',
			musicTrack: '',
			ready: false,
			status: 'silent'
		});
	}

	async dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.#invalidateWork();
		if (!this.request.settled) this.request.settle('superseded');
		await this.transport.dispose();
	}
}
