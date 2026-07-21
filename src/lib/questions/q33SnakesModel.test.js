import assert from 'node:assert/strict';
import test from 'node:test';
import {
	ROTATION_ORDER,
	areAdjacentCircles,
	nextEligibleCircle,
	nextScheduledCircle,
	rotationRateForDetail,
	rotationOrderIsValid
} from './q33SnakesModel.js';

test('rotation rate adapts only for the two strongest detail claims', () => {
	assert.equal(rotationRateForDetail(1), 0.5);
	assert.equal(rotationRateForDetail(2), 1);
	for (const value of [3, 4, 5, 6, 7, undefined, null, '1']) {
		assert.equal(rotationRateForDetail(value), 3);
	}
});

test('the rotation schedule includes all sixteen circles without adjacent transitions', () => {
	assert.deepEqual(
		[...ROTATION_ORDER].sort((a, b) => a - b),
		Array.from({ length: 16 }, (_, index) => index)
	);
	assert.equal(rotationOrderIsValid(), true);
	for (let i = 0; i < ROTATION_ORDER.length; i += 1) {
		const current = ROTATION_ORDER[i];
		const next = nextScheduledCircle(current);
		assert.notEqual(next, current);
		assert.equal(areAdjacentCircles(current, next), false);
	}
});

test('excluded circles are skipped without introducing an adjacent transition', () => {
	assert.equal(nextEligibleCircle(0, [2]), 6);
	assert.equal(nextEligibleCircle(5, [7, 9]), 11);
	assert.equal(nextEligibleCircle(0, Array.from({ length: 14 }, (_, index) => index + 1)), 15);
	assert.equal(areAdjacentCircles(0, nextEligibleCircle(0, [2])), false);
});

test('adjacency means sharing an edge in the 4×4 board', () => {
	assert.equal(areAdjacentCircles(5, 1), true);
	assert.equal(areAdjacentCircles(5, 4), true);
	assert.equal(areAdjacentCircles(5, 0), false);
	assert.equal(areAdjacentCircles(0, 3), false);
});
