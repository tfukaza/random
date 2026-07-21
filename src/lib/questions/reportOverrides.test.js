import assert from 'node:assert/strict';
import test from 'node:test';
import {
	ASTROTURF_REPORT,
	MAX_DISHONESTY_BREAKDOWN,
	MAX_DISHONESTY_SCORE,
	MIN_HONESTY_SCORE,
	reportOverrideFor
} from '../reportOverrides.js';

test('the compatible dishonesty maxima total 36 points', () => {
	assert.equal(MAX_DISHONESTY_BREAKDOWN.length, 12);
	assert.equal(MAX_DISHONESTY_SCORE, 36);
	assert.equal(MIN_HONESTY_SCORE, -36);
});

test('AstroTurf overrides only the exact theoretical maximum', () => {
	assert.equal(reportOverrideFor({ honesty: -36 }), ASTROTURF_REPORT);
	assert.equal(reportOverrideFor({ honesty: -35 }), null);
	assert.equal(reportOverrideFor({ honesty: -37 }), null);
	assert.equal(reportOverrideFor({}), null);
});
