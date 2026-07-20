import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MUSIC_RATES,
	musicVolume,
	normalizeMusicRate,
	normalizeSfxRate,
	normalizeSfxVolume,
	scheduleMusicRate
} from './mix.js';

test('normalizes the three authored music rates without non-finite values', () => {
	assert.equal(normalizeMusicRate(1), 1);
	assert.equal(normalizeMusicRate(1 / 3), MUSIC_RATES.slow);
	assert.equal(normalizeMusicRate(5), MUSIC_RATES.fast);
	assert.equal(normalizeMusicRate(Number.NaN), 1);
	assert.equal(normalizeMusicRate(Number.POSITIVE_INFINITY), 1);
});

test('reverses a live rate ramp from its held value and reaches the exact endpoint one second later', () => {
	/** @type {Array<Array<number | string>>} */
	const calls = [];
	const param = {
		value: 1,
		cancelScheduledValues: (/** @type {number} */ time) => calls.push(['cancel', time]),
		cancelAndHoldAtTime: (/** @type {number} */ time) => calls.push(['hold', time]),
		setValueAtTime(/** @type {number} */ value, /** @type {number} */ time) {
			calls.push(['value', value, time]);
		},
		exponentialRampToValueAtTime(/** @type {number} */ value, /** @type {number} */ time) {
			calls.push(['exponential', value, time]);
		}
	};

	scheduleMusicRate(param, 5, 10, 1);
	const heldAtFortyPercent = Math.pow(5, 0.4);
	scheduleMusicRate(param, 1, 10.4, 1, heldAtFortyPercent);

	assert.deepEqual(calls, [
		['hold', 10],
		['exponential', 5, 11],
		['hold', 10.4],
		['exponential', 1, 11.4]
	]);
});

test('uses the computed mid-ramp value when cancelAndHoldAtTime is unavailable', () => {
	/** @type {Array<Array<number | string>>} */
	const calls = [];
	const param = {
		value: 1,
		cancelScheduledValues: (/** @type {number} */ time) => calls.push(['cancel', time]),
		setValueAtTime: (/** @type {number} */ value, /** @type {number} */ time) =>
			calls.push(['value', value, time]),
		exponentialRampToValueAtTime: (/** @type {number} */ value, /** @type {number} */ time) =>
			calls.push(['exponential', value, time])
	};
	const heldAtHalfway = Math.sqrt(5);

	scheduleMusicRate(param, 1, 4.5, 1, heldAtHalfway);

	assert.deepEqual(calls, [
		['cancel', 4.5],
		['value', heldAtHalfway, 4.5],
		['exponential', 1, 5.5]
	]);
});

test('reconstructs the remastered default music mix and applies ducking', () => {
	assert.equal(musicVolume('default', 1), 2 / 3);
	assert.equal(musicVolume('default', 1 / 3), 1);
	assert.equal(musicVolume('default', 5), 0.48);
	assert.ok(Math.abs(musicVolume('default', 1, 0.3) - 0.2) < Number.EPSILON);
	assert.equal(musicVolume('asteroid', 1, 0.22), 0.22);
});

test('sanitizes per-play sound options to native gain and rate ranges', () => {
	assert.equal(normalizeSfxVolume(undefined), 1);
	assert.equal(normalizeSfxVolume(3), 1);
	assert.equal(normalizeSfxVolume(-2), 0);
	assert.equal(normalizeSfxVolume(Number.NaN), 1);
	assert.equal(normalizeSfxRate(0), 0.5);
	assert.equal(normalizeSfxRate(9), 4);
	assert.equal(normalizeSfxRate(Number.NaN), 1);
});
