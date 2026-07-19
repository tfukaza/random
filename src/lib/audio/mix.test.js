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

test('schedules fast and normal rates on the same live source without stale automation', () => {
	/** @type {Array<Array<number | string>>} */
	const calls = [];
	const param = {
		value: 1,
		cancelScheduledValues: (/** @type {number} */ time) => calls.push(['cancel', time]),
		setValueAtTime(/** @type {number} */ value, /** @type {number} */ time) {
			this.value = value;
			calls.push(['value', value, time]);
		},
		setTargetAtTime(
			/** @type {number} */ value,
			/** @type {number} */ time,
			/** @type {number} */ constant
		) {
			calls.push(['target', value, time, constant]);
		}
	};

	scheduleMusicRate(param, 5, 10, 1);
	scheduleMusicRate(param, 1, 11, 1);
	assert.deepEqual(calls.at(-2), ['target', 1, 11, 0.2]);
	assert.deepEqual(calls.at(-1), ['value', 1, 12]);
	assert.equal(param.value, 1);

	scheduleMusicRate(param, 1 / 3, 12, 1);
	scheduleMusicRate(param, 1, 13, 1);
	assert.deepEqual(calls.at(-2), ['target', 1, 13, 0.2]);
	assert.deepEqual(calls.at(-1), ['value', 1, 14]);
	assert.equal(param.value, 1);
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
