// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioCoordinator } from './audio-engine.js';

function deferred() {
	/** @type {(value?: any) => void} */
	let resolve = () => {};
	/** @type {(error?: any) => void} */
	let reject = () => {};
	const promise = new Promise((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

async function within(promise, label = 'operation', milliseconds = 500) {
	let timer;
	try {
		return await Promise.race([
			promise,
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(`${label} did not settle`)), milliseconds);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

async function eventually(predicate, label = 'condition') {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => setImmediate(resolve));
	}
	assert.fail(`${label} was not reached`);
}

async function drain() {
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
}

class FakeTransport {
	constructor() {
		this.calls = [];
		this.muted = false;
		this.activeTrackValue = '';
		this.activeCueValue = '';
		this.positionValue = 0;
		this.prepareResults = new Map();
		this.stopGate = null;
		this.suspendGate = null;
		this.recoverGate = null;
		this.failAt = '';
		this.startOutcome = 'playing';
		this.overlapDetected = false;
		this.running = true;
		this.disposed = false;
	}

	/** @param {string} track @param {...(boolean | Promise<boolean>)} results */
	queuePrepare(track, ...results) {
		this.prepareResults.set(track, [...results]);
	}

	/** @param {string} operation */
	maybeFail(operation) {
		if (this.failAt !== operation) return;
		this.failAt = '';
		throw new Error(`${operation} failed`);
	}

	setMuted(muted) {
		this.muted = muted;
		this.calls.push({ operation: 'setMuted', muted });
	}

	async activate() {
		this.calls.push({ operation: 'activate' });
		return true;
	}

	async prepareMusic(track) {
		this.calls.push({ operation: 'prepareMusic', track });
		this.maybeFail('prepareMusic');
		const queue = this.prepareResults.get(track);
		if (!queue?.length) return true;
		return await queue.shift();
	}

	activeCue() {
		return this.activeCueValue;
	}

	activeTrack() {
		return this.activeTrackValue;
	}

	async stopMusic(fadeMs) {
		const trackBeforeStop = this.activeTrackValue;
		const cueBeforeStop = this.activeCueValue;
		this.calls.push({ operation: 'stopMusic', fadeMs, trackBeforeStop, cueBeforeStop });
		this.maybeFail('stopMusic');
		if (trackBeforeStop && this.stopGate) await this.stopGate.promise;
		if (this.activeCueValue === cueBeforeStop) {
			this.activeTrackValue = '';
			this.activeCueValue = '';
		}
	}

	async startMusic(track, options) {
		const activeBeforeStart = this.activeTrackValue;
		this.calls.push({ operation: 'startMusic', track, options, activeBeforeStart });
		this.maybeFail('startMusic');
		if (activeBeforeStart) this.overlapDetected = true;
		if (this.startOutcome !== 'playing') return this.startOutcome;
		this.activeTrackValue = track;
		this.activeCueValue = options.cueKey;
		return 'playing';
	}

	setMusicRate(rate, rampMs) {
		this.calls.push({ operation: 'setMusicRate', rate, rampMs });
	}

	async suspend() {
		this.calls.push({ operation: 'suspend' });
		if (this.suspendGate) await this.suspendGate.promise;
		this.running = false;
	}

	async resume(options = {}) {
		this.calls.push({ operation: 'resume', options });
		this.maybeFail('resume');
		this.running = true;
		return true;
	}

	async recover() {
		this.calls.push({ operation: 'recover' });
		this.maybeFail('recover');
		if (this.recoverGate) await this.recoverGate.promise;
		this.activeTrackValue = '';
		this.activeCueValue = '';
		return true;
	}

	position() {
		return this.positionValue;
	}

	async dispose() {
		this.disposed = true;
		this.calls.push({ operation: 'dispose' });
	}
}

function harness(transport = new FakeTransport()) {
	const state = {};
	const traces = [];
	const coordinator = new AudioCoordinator({
		transport,
		onState: (patch) => Object.assign(state, patch),
		onTrace: (event, detail) => traces.push({ event, detail })
	});
	return { coordinator, state, traces, transport };
}

async function startTrack(coordinator, track, cueKey) {
	const request = coordinator.play(track, { cueKey });
	const activation = coordinator.activateFromGesture();
	assert.equal(await within(request.whenStarted, `${track} request`), 'playing');
	assert.equal(await within(activation, `${track} activation`), 'playing');
	return request;
}

test('a newer intent supersedes a request even while the old prepare never returns', async () => {
	const firstPrepare = deferred();
	const transport = new FakeTransport();
	transport.queuePrepare('A', firstPrepare.promise);
	const { coordinator } = harness(transport);

	const requestA = coordinator.play('A', { cueKey: 'scene-a' });
	const activation = coordinator.activateFromGesture();
	await eventually(
		() => transport.calls.some((call) => call.operation === 'prepareMusic' && call.track === 'A'),
		'A prepare'
	);

	const requestB = coordinator.play('B', { cueKey: 'scene-b' });
	assert.equal(await within(requestA.whenStarted, 'superseded A request'), 'superseded');
	assert.equal(await within(requestB.whenStarted, 'latest B request'), 'playing');
	await within(activation, 'activation');

	assert.deepEqual(
		transport.calls
			.filter((call) => call.operation === 'startMusic')
			.map((call) => call.track),
		['B']
	);
	assert.equal(transport.activeTrack(), 'B');
	await coordinator.dispose();
});

test('explicit silence is not blocked by an obsolete prepare that never settles', async () => {
	const stuckPrepare = deferred();
	const transport = new FakeTransport();
	transport.queuePrepare('A', stuckPrepare.promise);
	const { coordinator } = harness(transport);

	const requestA = coordinator.play('A', { cueKey: 'scene-a' });
	const activation = coordinator.activateFromGesture();
	await eventually(
		() => transport.calls.some((call) => call.operation === 'prepareMusic' && call.track === 'A'),
		'A prepare'
	);

	const silence = coordinator.stop({ transition: 'cut' });
	assert.equal(await within(requestA.whenStarted, 'superseded A request'), 'superseded');
	assert.equal(await within(silence.whenStarted, 'silence request'), 'silent');
	await within(activation, 'activation');
	assert.deepEqual(
		transport.calls.filter((call) => call.operation === 'startMusic'),
		[]
	);
	assert.equal(transport.activeTrack(), '');
	await coordinator.dispose();
});

test('a rapid A to B to A sequence cannot revive the obsolete middle cue', async () => {
	const { coordinator, transport } = harness();
	await startTrack(coordinator, 'A', 'scene-a');
	const stuckB = deferred();
	transport.queuePrepare('B', stuckB.promise);

	const requestB = coordinator.play('B', { cueKey: 'scene-b' });
	await eventually(
		() => transport.calls.some((call) => call.operation === 'prepareMusic' && call.track === 'B'),
		'B prepare'
	);
	const requestA = coordinator.play('A', { cueKey: 'scene-a' });

	assert.equal(await within(requestB.whenStarted, 'superseded B request'), 'superseded');
	assert.equal(await within(requestA.whenStarted, 'restored A request'), 'playing');
	assert.deepEqual(
		transport.calls
			.filter((call) => call.operation === 'startMusic')
			.map((call) => call.track),
		['A']
	);
	assert.equal(transport.activeTrack(), 'A');
	await coordinator.dispose();
});

test('same-cue repeats and rate changes never restart the source', async () => {
	const { coordinator, transport } = harness();
	const first = await startTrack(coordinator, 'A', 'same-scene');

	assert.strictEqual(coordinator.play('A', { cueKey: 'same-scene' }), first);
	const rateChange = coordinator.play('A', { cueKey: 'same-scene', rate: 'fast' });
	assert.equal(await within(rateChange.whenStarted, 'rate change'), 'playing');

	assert.equal(
		transport.calls.filter((call) => call.operation === 'startMusic').length,
		1
	);
	assert.deepEqual(
		transport.calls.filter((call) => call.operation === 'setMusicRate'),
		[{ operation: 'setMusicRate', rate: 'fast', rampMs: 1000 }]
	);
	await coordinator.dispose();
});

test('mute and unmute preserve a matching live cue without restarting it', async () => {
	const { coordinator, transport } = harness();
	await startTrack(coordinator, 'A', 'continuous-scene');

	const muted = coordinator.setEnabled(false);
	assert.equal(await within(muted.whenStarted, 'mute'), 'silent');
	assert.equal(transport.muted, true);
	assert.equal(transport.activeTrack(), 'A');

	const unmuted = coordinator.setEnabled(true);
	assert.equal(await within(unmuted.whenStarted, 'unmute'), 'playing');
	assert.equal(transport.muted, false);
	assert.equal(transport.activeTrack(), 'A');
	assert.equal(
		transport.calls.filter((call) => call.operation === 'startMusic').length,
		1
	);
	await coordinator.dispose();
});

test('a stale suspend that finishes after foreground resume is actively corrected', async () => {
	const { coordinator, state, transport } = harness();
	await startTrack(coordinator, 'A', 'visible-scene');
	transport.suspendGate = deferred();

	const staleSuspend = coordinator.suspend();
	await eventually(
		() => transport.calls.some((call) => call.operation === 'suspend'),
		'suspend call'
	);
	assert.equal(state.status, 'interrupted');
	assert.equal(await coordinator.resume(), true);
	assert.equal(transport.running, true);

	transport.suspendGate.resolve();
	await staleSuspend;
	await drain();
	assert.equal(transport.running, true);
	assert.equal(state.status, 'playing');
	const resumes = transport.calls.filter((call) => call.operation === 'resume');
	assert.ok(
		resumes.length >= 3,
		'initial reconciliation, foreground resume, and stale-suspend correction all resumed'
	);
	assert.ok(resumes.some((call) => call.options.verifyClock === true));
	assert.ok(resumes.some((call) => call.options.verifyClock !== true));
	await coordinator.dispose();
});

test('an A to B switch completes the exclusive stop before starting B', async () => {
	const { coordinator, transport } = harness();
	await startTrack(coordinator, 'A', 'scene-a');

	transport.stopGate = deferred();
	const requestB = coordinator.play('B', { cueKey: 'scene-b' });
	await eventually(
		() =>
			transport.calls.some(
				(call) => call.operation === 'stopMusic' && call.trackBeforeStop === 'A'
			),
		'A fade-out'
	);
	await drain();

	assert.equal(transport.activeTrack(), 'A');
	assert.deepEqual(
		transport.calls
			.filter((call) => call.operation === 'startMusic')
			.map((call) => call.track),
		['A']
	);

	transport.stopGate.resolve();
	assert.equal(await within(requestB.whenStarted, 'B request'), 'playing');
	const startB = transport.calls.find(
		(call) => call.operation === 'startMusic' && call.track === 'B'
	);
	assert.equal(startB.activeBeforeStart, '');
	assert.equal(startB.options.fadeMs, 140);
	assert.equal(transport.overlapDetected, false);
	assert.equal(transport.activeTrack(), 'B');
	await coordinator.dispose();
});

test('a stale scoped request cannot stop the scene that replaced it', async () => {
	const { coordinator, transport } = harness();
	const requestA = await startTrack(coordinator, 'A', 'scene-a');
	const requestB = coordinator.play('B', { cueKey: 'scene-b' });
	assert.equal(await within(requestB.whenStarted, 'B request'), 'playing');
	const stopsBeforeStaleHandle = transport.calls.filter(
		(call) => call.operation === 'stopMusic'
	).length;

	assert.strictEqual(requestA.stop(), requestB);
	await drain();
	assert.equal(transport.activeTrack(), 'B');
	assert.equal(
		transport.calls.filter((call) => call.operation === 'stopMusic').length,
		stopsBeforeStaleHandle
	);

	const silence = requestB.stop();
	assert.notStrictEqual(silence, requestB);
	assert.equal(await within(silence.whenStarted, 'scoped silence request'), 'silent');
	assert.equal(transport.activeTrack(), '');
	await coordinator.dispose();
});

test('a naturally ended finite cue is not restarted by resume or recovery', async () => {
	const { coordinator, state, transport } = harness();
	await startTrack(coordinator, 'report', 'final-report');
	// Model the finite file ending after its initial start reconciliation has
	// completed, as a real onended event does after playback.
	await drain();
	transport.positionValue = 19;
	transport.activeTrackValue = '';
	transport.activeCueValue = '';
	coordinator.naturalEnd('final-report');

	assert.equal(state.status, 'silent');
	assert.equal(await coordinator.resume(), true);
	await drain();
	assert.equal(
		transport.calls.filter((call) => call.operation === 'startMusic').length,
		1
	);

	assert.equal(await within(coordinator.recoverFromGesture(), 'finite-cue recovery'), 'silent');
	assert.equal(
		transport.calls.filter((call) => call.operation === 'startMusic').length,
		1
	);
	assert.equal(transport.activeTrack(), '');
	await coordinator.dispose();
});

test('an immediate natural end cancels a residual activation reconcile', async () => {
	const { coordinator, transport } = harness();
	await startTrack(coordinator, 'asteroid', 'short-remainder');
	transport.activeTrackValue = '';
	transport.activeCueValue = '';
	coordinator.naturalEnd('short-remainder');

	await coordinator.resume();
	await drain();
	assert.equal(
		transport.calls.filter((call) => call.operation === 'startMusic').length,
		1
	);
	assert.equal(transport.activeTrack(), '');
	await coordinator.dispose();
});

test('recovery preserves a pending request and settles its original handle', async () => {
	const stuckPrepare = deferred();
	const transport = new FakeTransport();
	transport.queuePrepare('A', stuckPrepare.promise, true);
	// A request that never became active has no meaningful transport position;
	// recovery must retain its authored offset and, most importantly, its handle.
	transport.positionValue = 99;
	const { coordinator } = harness(transport);
	const request = coordinator.play('A', { cueKey: 'timed-scene', startOffset: 7.25 });
	const activation = coordinator.activateFromGesture();
	await eventually(
		() =>
			transport.calls.filter(
				(call) => call.operation === 'prepareMusic' && call.track === 'A'
			).length === 1,
		'first prepare'
	);

	const recovery = coordinator.recoverFromGesture();
	await eventually(() => coordinator.intent.revision === 2, 'recovery intent');
	assert.equal(coordinator.intent.startOffset, 7.25);
	await eventually(
		() =>
			transport.calls.filter(
				(call) => call.operation === 'prepareMusic' && call.track === 'A'
			).length === 2,
		'recovery prepare'
	);
	assert.strictEqual(coordinator.request, request);
	assert.equal(await within(request.whenStarted, 'original pending request'), 'playing');
	assert.equal(await within(recovery, 'recovery request'), 'playing');
	await within(activation, 'activation');

	const start = transport.calls.find((call) => call.operation === 'startMusic');
	assert.equal(
		start.options.startOffset,
		7.25,
		JSON.stringify(transport.calls.filter((call) => call.operation === 'startMusic'))
	);
	assert.equal(transport.activeCue(), 'timed-scene');
	await coordinator.dispose();
});

test('transport exceptions settle requests as failed instead of escaping reconciliation', async (t) => {
	for (const operation of ['resume', 'prepareMusic', 'stopMusic', 'startMusic']) {
		await t.test(operation, async () => {
			const transport = new FakeTransport();
			transport.failAt = operation;
			const { coordinator, state, traces } = harness(transport);
			const request = coordinator.play('A', { cueKey: `failure-${operation}` });
			const activation = coordinator.activateFromGesture();

			assert.equal(await within(request.whenStarted, `${operation} request`), 'failed');
			assert.equal(await within(activation, `${operation} activation`), 'failed');
			assert.equal(state.status, 'error');
			assert.equal(state.errorCategory, 'transport');
			assert.ok(traces.some((trace) => trace.event === 'transport-error'));
			await coordinator.dispose();
		});
	}
});
