// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { WebAudioTransport } from './web-audio-transport.js';

class FakeAudioParam {
	constructor(value = 1) {
		this.value = value;
		this.calls = [];
	}

	cancelAndHoldAtTime(time) {
		this.calls.push(['hold', time]);
	}
	cancelScheduledValues(time) {
		this.calls.push(['cancel', time]);
	}

	setValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['set', value, time]);
	}

	linearRampToValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['linear', value, time]);
	}

	exponentialRampToValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['exponential', value, time]);
	}
}

class FakeGainNode {
	constructor() {
		this.gain = new FakeAudioParam();
		this.disconnected = false;
	}

	connect() {
		return this;
	}

	disconnect() {
		this.disconnected = true;
	}
}

class FakeBufferSource {
	constructor(context) {
		this.context = context;
		this.buffer = null;
		this.loop = false;
		this.playbackRate = new FakeAudioParam();
		this.onended = null;
		this.started = false;
		this.stopped = false;
		this.disconnected = false;
	}

	connect() {
		return this;
	}

	disconnect() {
		this.disconnected = true;
	}

	start(_when = 0, offset = 0) {
		assert.equal(this.started, false, 'a source may only be started once');
		this.started = true;
		this.offset = offset;
		this.context.liveSources.add(this);
		this.context.maxLiveSources = Math.max(
			this.context.maxLiveSources,
			this.context.liveSources.size
		);
		this.context.events.push(`start:${this.buffer?.name ?? 'unknown'}`);
	}

	stop() {
		if (this.stopped) return;
		this.stopped = true;
		this.context.liveSources.delete(this);
		this.context.events.push(`stop:${this.buffer?.name ?? 'unknown'}`);
	}

	emitEnded() {
		this.context.liveSources.delete(this);
		this.onended?.();
	}
}

class FakeAudioContext {
	constructor() {
		this.state = 'running';
		this.currentTime = 10;
		this.sampleRate = 48000;
		this.destination = new FakeGainNode();
		this.sources = [];
		this.liveSources = new Set();
		this.maxLiveSources = 0;
		this.events = [];
		this.listeners = new Map();
		this.closed = false;
	}

	createBufferSource() {
		const source = new FakeBufferSource(this);
		this.sources.push(source);
		return source;
	}

	createGain() {
		return new FakeGainNode();
	}

	createDynamicsCompressor() {
		return {
			threshold: new FakeAudioParam(),
			knee: new FakeAudioParam(),
			ratio: new FakeAudioParam(),
			attack: new FakeAudioParam(),
			release: new FakeAudioParam(),
			connect() {},
			disconnect() {}
		};
	}

	createBuffer(_channels, _length, _sampleRate) {
		return { duration: 1 / this.sampleRate, name: 'pulse' };
	}

	addEventListener(type, listener) {
		let listeners = this.listeners.get(type);
		if (!listeners) this.listeners.set(type, (listeners = new Set()));
		listeners.add(listener);
	}

	removeEventListener(type, listener) {
		this.listeners.get(type)?.delete(listener);
	}

	emit(type) {
		for (const listener of this.listeners.get(type) ?? []) listener();
	}

	async resume() {
		this.state = 'running';
		this.emit('statechange');
	}

	async suspend() {
		this.state = 'suspended';
		this.emit('statechange');
	}

	async close() {
		this.closed = true;
		this.state = 'closed';
		this.emit('statechange');
	}
}

async function within(promise, milliseconds = 100) {
	let timer;
	try {
		return await Promise.race([
			promise,
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error('operation did not settle')), milliseconds);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

async function withGlobal(name, value, callback) {
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
	Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
	try {
		return await callback();
	} finally {
		if (descriptor) Object.defineProperty(globalThis, name, descriptor);
		else delete globalThis[name];
	}
}

function musicOptions(cueKey, overrides = {}) {
	return {
		cueKey,
		rate: 'normal',
		startOffset: 0,
		fadeMs: 0,
		...overrides
	};
}

function createHarness() {
	const context = new FakeAudioContext();
	const transport = new WebAudioTransport();
	transport.context = context;
	transport.musicBus = context.createGain();
	transport.sfxBus = context.createGain();
	for (const [track, duration] of [
		['default', 120],
		['asteroid', 12],
		['report', 90]
	]) {
		transport.decoded.set(`music:${track}`, {
			generation: transport.generation,
			buffer: { duration, name: track }
		});
	}
	return { context, transport };
}

function installDecodedMusic(transport, track, duration) {
	transport.decoded.set(`music:${track}`, {
		generation: transport.generation,
		buffer: { duration, name: track }
	});
}

test('a replacement waits for the prior music voice to stop completely', async () => {
	const { context, transport } = createHarness();

	assert.equal(
		await transport.startMusic('default', musicOptions('default-scene')),
		'playing'
	);
	// The transport retains compressed bytes but intentionally evicts decoded
	// non-current scores. The coordinator prepares the incoming score before a
	// switch, represented here by installing its decoded buffer.
	installDecodedMusic(transport, 'report', 90);
	const stopping = transport.stopMusic(8);
	const replacement = transport.startMusic('report', musicOptions('report-scene'));

	assert.equal(await replacement, 'playing');
	await stopping;
	assert.deepEqual(context.events, ['start:default', 'stop:default', 'start:report']);
	assert.equal(context.maxLiveSources, 1);
	assert.equal(context.liveSources.size, 1);
	assert.equal(transport.activeTrack(), 'report');
});

test('a finite track whose requested offset is at or beyond its duration is already ended', async () => {
	const { context, transport } = createHarness();

	assert.equal(
		await transport.startMusic(
			'asteroid',
			musicOptions('late-asteroid', { startOffset: 12 })
		),
		'ended'
	);
	assert.equal(context.sources.length, 0, 'an already-ended cue must not allocate a voice');
	assert.equal(transport.activeTrack(), '');
	assert.equal(
		await transport.startMusic(
			'asteroid',
			musicOptions('very-late-asteroid', { startOffset: 99 })
		),
		'ended'
	);
	assert.equal(context.sources.length, 0);
});

test('stale and intentionally stopped onended callbacks cannot report a natural ending', async () => {
	const { context, transport } = createHarness();
	const naturalEnds = [];
	transport.setHandlers({ onNaturalEnd: (cueKey) => naturalEnds.push(cueKey) });

	await transport.startMusic('asteroid', musicOptions('old-asteroid'));
	const staleSource = context.sources.at(-1);
	installDecodedMusic(transport, 'report', 90);
	await transport.startMusic('report', musicOptions('new-report'));
	staleSource.emitEnded();
	assert.deepEqual(naturalEnds, []);

	const intentionallyStopped = context.sources.at(-1);
	await transport.stopMusic(0);
	intentionallyStopped.emitEnded();
	assert.deepEqual(naturalEnds, []);

	installDecodedMusic(transport, 'asteroid', 12);
	await transport.startMusic('asteroid', musicOptions('natural-asteroid'));
	context.sources.at(-1).emitEnded();
	assert.deepEqual(naturalEnds, ['natural-asteroid']);
	assert.equal(transport.activeTrack(), '');
});

test('SFX tags replace live voices and scopes cancel work that is still pending', async () => {
	const { context, transport } = createHarness();
	transport.resume = async () => true;
	const sfxBuffer = { duration: 0.2, name: 'ui-tap' };
	transport.encoded.set('sfx:ui-tap', new ArrayBuffer(1));
	transport.decoded.set('sfx:ui-tap', {
		generation: transport.generation,
		buffer: sfxBuffer
	});
	const first = await transport.playSfx('ui-tap', { tag: 'button' });
	const second = await transport.playSfx('ui-tap', { tag: 'button' });
	assert.ok(first);
	assert.ok(second);
	assert.equal(first.stopped, true, 'reusing a tag stops its previous voice');
	assert.equal(second.stopped, false);
	assert.equal(transport.sfxVoices.size, 1);
	transport.stopSfx('button');
	assert.equal(second.stopped, true);
	assert.equal(transport.sfxVoices.size, 0);

	transport.resume = () => new Promise(() => {});
	const startsBeforePendingCue = context.events.filter((event) => event === 'start:ui-tap').length;
	const pending = transport.playSfx('ui-tap', { scope: 'departing-scene' });
	transport.stopSfxScope('departing-scene');
	assert.equal(await within(pending), null);
	assert.equal(
		context.events.filter((event) => event === 'start:ui-tap').length,
		startsBeforePendingCue,
		'a cancelled pending scope must never create a late voice'
	);
	assert.equal(transport.scopedSfx.has('departing-scene'), false);
});

test('context running is a distinct recovery signal and AudioSession inactive stays informational', async () => {
	const contextStates = [];
	let running = 0;
	let sessionActive = 0;
	await withGlobal('window', { AudioContext: FakeAudioContext }, async () => {
		const transport = new WebAudioTransport();
		transport.setHandlers({
			onContextState: (state) => contextStates.push(state),
			onContextRunning: () => (running += 1)
		});
		const context = transport._ensureContext();
		context.state = 'interrupted';
		context.emit('statechange');
		context.state = 'running';
		context.emit('statechange');
		assert.deepEqual(contextStates, ['interrupted']);
		assert.equal(running, 1);

		// The coordinator already records its own visibility suspension. A late
		// native state event for that operation must not overwrite a newer intent.
		context.suspend = async () => {
			context.state = 'suspended';
		};
		await transport.suspend();
		context.emit('statechange');
		assert.deepEqual(contextStates, ['interrupted']);
		context.state = 'running';
		context.emit('statechange');
		context.state = 'suspended';
		context.emit('statechange');
		assert.deepEqual(contextStates, ['interrupted', 'suspended']);
		await transport.dispose();
	});

	const session = {
		state: 'inactive',
		listener: null,
		addEventListener(_type, listener) {
			this.listener = listener;
		},
		removeEventListener() {
			this.listener = null;
		}
	};
	const sessionStates = [];
	const sessionTraces = [];
	await withGlobal('navigator', { audioSession: session }, async () => {
		const transport = new WebAudioTransport({
			onTrace: (event, detail) => sessionTraces.push({ event, detail })
		});
		transport.setHandlers({
			onContextState: (state) => sessionStates.push(state),
			onSessionActive: () => (sessionActive += 1)
		});
		transport._configurePlatform();
		session.listener();
		assert.deepEqual(sessionStates, []);
		assert.ok(
			sessionTraces.some(
				({ event, detail }) => event === 'audio-session' && detail.state === 'inactive'
			)
		);
		session.state = 'interrupted';
		session.listener();
		assert.deepEqual(sessionStates, ['session-interrupted']);
		session.state = 'active';
		session.listener();
		assert.equal(sessionActive, 1);
		await transport.dispose();
	});
});

test('resume and decode attempts time out instead of retaining pending operations forever', async () => {
	const traces = [];
	const context = new FakeAudioContext();
	context.state = 'suspended';
	context.resume = () => new Promise(() => {});
	context.decodeAudioData = () => new Promise(() => {});
	const transport = new WebAudioTransport({
		contextOperationTimeoutMs: 5,
		decodeTimeoutMs: 5,
		onTrace: (event, detail) => traces.push({ event, detail })
	});
	transport.context = context;

	assert.equal(await within(transport.resume()), false);
	assert.equal(await within(transport._decode('music:hung', new ArrayBuffer(1))), null);
	assert.equal(transport.pendingDecodes.size, 0);
	assert.ok(traces.some(({ event }) => event === 'context-resume-timeout'));
	assert.ok(traces.some(({ event }) => event === 'asset-decode-timeout'));
	await transport.dispose();

	const suspendTraces = [];
	const suspendingContext = new FakeAudioContext();
	suspendingContext.suspend = () => new Promise(() => {});
	const suspending = new WebAudioTransport({
		contextOperationTimeoutMs: 5,
		onTrace: (event, detail) => suspendTraces.push({ event, detail })
	});
	suspending.context = suspendingContext;
	await within(suspending.suspend());
	assert.equal(suspending.intentionalSuspend, null);
	assert.ok(suspendTraces.some(({ event }) => event === 'context-suspend-timeout'));
	await suspending.dispose();
});

test('lifecycle resume verifies that a nominally running audio clock actually advances', async () => {
	const stalledTraces = [];
	const stalledContext = new FakeAudioContext();
	const stalled = new WebAudioTransport({
		clockProbeMs: 5,
		onTrace: (event, detail) => stalledTraces.push({ event, detail })
	});
	stalled.context = stalledContext;
	assert.equal(await within(stalled.resume({ verifyClock: true })), false);
	assert.ok(stalledTraces.some(({ event }) => event === 'context-clock-stalled'));
	await stalled.dispose();

	const movingContext = new FakeAudioContext();
	const beganAt = performance.now();
	Object.defineProperty(movingContext, 'currentTime', {
		configurable: true,
		get: () => 10 + (performance.now() - beganAt) / 1000
	});
	const moving = new WebAudioTransport({ clockProbeMs: 5 });
	moving.context = movingContext;
	assert.equal(await within(moving.resume({ verifyClock: true })), true);
	await moving.dispose();

	const activation = new WebAudioTransport();
	const activationContext = new FakeAudioContext();
	activation.context = activationContext;
	activation.sfxBus = activationContext.createGain();
	activation._schedulePreload = () => {};
	const reasons = [];
	activation._verifyRunningClock = async (_context, reason) => {
		reasons.push(reason);
		return true;
	};
	assert.equal(await activation.activate(), true);
	assert.deepEqual(reasons, ['activation']);
	await activation.dispose();
});

test('recovery re-arms core SFX preloading for the replacement context', async () => {
	class RecoveryContext extends FakeAudioContext {
		constructor() {
			super();
			RecoveryContext.last = this;
		}
	}
	const oldContext = new FakeAudioContext();
	const transport = new WebAudioTransport({ contextOperationTimeoutMs: 20 });
	transport.context = oldContext;
	transport.masterGain = oldContext.createGain();
	transport.musicBus = oldContext.createGain();
	transport.sfxBus = oldContext.createGain();
	transport.limiter = oldContext.createDynamicsCompressor();
	transport.preloadScheduled = true;
	transport.decoded.set('sfx:ui-tap', {
		generation: transport.generation,
		buffer: { duration: 0.1 }
	});
	let preloads = 0;
	const clockReasons = [];
	transport._verifyRunningClock = async (_context, reason) => {
		clockReasons.push(reason);
		return true;
	};
	transport._schedulePreload = () => {
		preloads += 1;
		transport.preloadScheduled = true;
	};

	await withGlobal('window', { AudioContext: RecoveryContext }, async () => {
		assert.equal(await transport.recover(), true);
		assert.equal(oldContext.closed, true);
		assert.equal(transport.context, RecoveryContext.last);
		assert.equal(transport.decoded.size, 0);
		assert.equal(preloads, 1);
		assert.equal(transport.preloadScheduled, true);
		assert.deepEqual(clockReasons, ['recovery']);
		await transport.dispose();
	});
});

test('a graph construction failure is rolled back instead of publishing a partial context', async () => {
	class BrokenContext extends FakeAudioContext {
		constructor() {
			super();
			BrokenContext.last = this;
		}

		createDynamicsCompressor() {
			throw new Error('compressor unavailable');
		}
	}
	const traces = [];
	await withGlobal('window', { AudioContext: BrokenContext }, async () => {
		const transport = new WebAudioTransport({
			contextOperationTimeoutMs: 20,
			onTrace: (event, detail) => traces.push({ event, detail })
		});
		assert.equal(transport._ensureContext(), null);
		assert.equal(transport.context, null);
		assert.equal(transport.masterGain, null);
		assert.equal(transport.musicBus, null);
		assert.equal(transport.sfxBus, null);
		assert.equal(transport.limiter, null);
		assert.equal(BrokenContext.last.closed, true);
		assert.ok(traces.some(({ event }) => event === 'context-create-error'));
		await transport.dispose();
	});
});

test('repeating an owned music-rate target preserves the in-flight ramp', async () => {
	const { context, transport } = createHarness();
	await transport.startMusic('default', musicOptions('rate-scene'));
	transport.setMusicRate('fast', 1000);
	const voice = transport.activeMusic;
	const ramp = voice.ramp;
	const automationCalls = voice.source.playbackRate.calls.length;
	context.currentTime += 0.4;
	transport.setMusicRate('fast', 1000);
	assert.equal(voice.ramp, ramp);
	assert.equal(voice.source.playbackRate.calls.length, automationCalls);
});

test('dispose aborts a fading voice and clears graph, cache, and listener references', async () => {
	const context = new FakeAudioContext();
	const transport = new WebAudioTransport({ contextOperationTimeoutMs: 20 });
	transport.context = context;
	transport.masterGain = context.createGain();
	transport.musicBus = context.createGain();
	transport.sfxBus = context.createGain();
	transport.limiter = context.createDynamicsCompressor();
	installDecodedMusic(transport, 'default', 120);
	await transport.startMusic('default', musicOptions('disposing-scene'));
	const source = context.sources.at(-1);
	const stopping = transport.stopMusic(10_000);
	let fetchAborted = false;
	transport.fetchControllers.add({ abort: () => (fetchAborted = true) });
	transport.encoded.set('music:default', new ArrayBuffer(1));
	transport.pendingFetches.set('pending', new Promise(() => {}));
	transport.decoded.set('sfx:ui-tap', { generation: transport.generation, buffer: {} });
	transport.pendingDecodes.set('pending', new Promise(() => {}));
	transport.ducks.set(Symbol('duck'), 0.2);
	let sessionRemoved = false;
	transport.session = {
		removeEventListener: () => (sessionRemoved = true)
	};
	transport.sessionListener = () => {};

	await within(transport.dispose());
	await within(stopping);
	assert.equal(source.stopped, true);
	assert.equal(fetchAborted, true);
	assert.equal(sessionRemoved, true);
	assert.equal(context.closed, true);
	for (const field of ['context', 'masterGain', 'musicBus', 'sfxBus', 'limiter', 'session'])
		assert.equal(transport[field], null);
	for (const map of [
		transport.encoded,
		transport.pendingFetches,
		transport.decoded,
		transport.pendingDecodes,
		transport.ducks,
		transport.taggedSfx,
		transport.scopedSfx
	])
		assert.equal(map.size, 0);
	assert.equal(transport.sfxVoices.size, 0);
	assert.equal(transport.pendingSfx.size, 0);
});
