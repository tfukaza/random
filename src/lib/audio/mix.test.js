import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MUSIC_RATES,
	musicVolume,
	normalizeMusicRate,
	normalizeSfxRate,
	normalizeSfxVolume
} from './mix.js';

test('normalizes the three authored music rates without non-finite values', () => {
	assert.equal(normalizeMusicRate(1), 1);
	assert.equal(normalizeMusicRate(1 / 3), MUSIC_RATES.slow);
	assert.equal(normalizeMusicRate(5), MUSIC_RATES.fast);
	assert.equal(normalizeMusicRate(Number.NaN), 1);
	assert.equal(normalizeMusicRate(Number.POSITIVE_INFINITY), 1);
});

test('keeps the HTML audio fallback inside Howler documented rates', () => {
	assert.equal(normalizeMusicRate(1 / 3, false), 0.5);
	assert.equal(normalizeMusicRate(5, false), 4);
});

test('reconstructs the remastered default music mix and applies ducking', () => {
	assert.equal(musicVolume('default', 1), 2 / 3);
	assert.equal(musicVolume('default', 1 / 3), 1);
	assert.equal(musicVolume('default', 5), 0.48);
	assert.ok(Math.abs(musicVolume('default', 1, 0.3) - 0.2) < Number.EPSILON);
	assert.equal(musicVolume('asteroid', 1, 0.22), 0.22);
});

test('sanitizes per-play sound options to Howler public ranges', () => {
	assert.equal(normalizeSfxVolume(undefined), 1);
	assert.equal(normalizeSfxVolume(3), 1);
	assert.equal(normalizeSfxVolume(-2), 0);
	assert.equal(normalizeSfxVolume(Number.NaN), 1);
	assert.equal(normalizeSfxRate(0), 0.5);
	assert.equal(normalizeSfxRate(9), 4);
	assert.equal(normalizeSfxRate(Number.NaN), 1);
});
