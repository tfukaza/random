import test from 'node:test';
import assert from 'node:assert/strict';
import {
	DAMAGE_RADIUS_RADIANS,
	TARGETS,
	damageAt,
	displayPercentages,
	scoreImpact
} from './q50PlanetModel.js';

/** @param {number[]} a @param {number[]} b */
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
/** @param {number[]} a @param {number[]} b */
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

test('defines seventeen evenly spread targets with a 12/5 surface split', () => {
	assert.equal(TARGETS.length, 17);
	assert.equal(TARGETS.filter((target) => target.surface === 'land').length, 12);
	assert.equal(TARGETS.filter((target) => target.surface === 'ocean').length, 5);
	let minimum = Infinity;
	for (let i = 0; i < TARGETS.length; i += 1) {
		for (let j = i + 1; j < TARGETS.length; j += 1) {
			minimum = Math.min(minimum, angle(TARGETS[i].normal, TARGETS[j].normal));
		}
	}
	assert.ok(minimum > DAMAGE_RADIUS_RADIANS);
});

test('a direct hit spends the entire budget on one target', () => {
	const damage = damageAt(TARGETS[6].normal);
	assert.ok(damage[6].share > 0.999999);
	assert.ok(damage.every((item, index) => index === 6 || item.share === 0));
	assert.equal(displayPercentages(damage).reduce((sum, item) => sum + item.percent, 0), 100);
});

test('a midpoint splits the fixed budget and every sampled orientation remains covered', () => {
	let pair = [0, 1];
	let pairAngle = Infinity;
	for (let i = 0; i < TARGETS.length; i += 1) {
		for (let j = i + 1; j < TARGETS.length; j += 1) {
			const candidate = angle(TARGETS[i].normal, TARGETS[j].normal);
			if (candidate < pairAngle) {
				pair = [i, j];
				pairAngle = candidate;
			}
		}
	}
	const midpoint = /** @type {[number, number, number]} */ (
		TARGETS[pair[0]].normal.map((value, index) => value + TARGETS[pair[1]].normal[index])
	);
	const split = damageAt(midpoint);
	assert.ok(Math.abs(split[pair[0]].share - split[pair[1]].share) < 1e-10);
	assert.ok(split[pair[0]].share > 0.45);

	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < 10000; i += 1) {
		const y = 1 - (2 * (i + 0.5)) / 10000;
		const r = Math.sqrt(1 - y * y);
		const point = /** @type {[number, number, number]} */ ([Math.cos(i * golden) * r, y, Math.sin(i * golden) * r]);
		const damage = damageAt(point);
		assert.ok(damage.some((item) => item.share > 0));
		assert.ok(Math.abs(damage.reduce((sum, item) => sum + item.share, 0) - 1) < 1e-12);
	}
});

test('scoring distinguishes concentrated, distributed, early, and timed-out decisions', () => {
	const direct = damageAt(TARGETS[0].normal);
	assert.deepEqual(
		{ risk: scoreImpact(direct, { elapsedMs: 3000, autoLocked: false }).risk, coord: scoreImpact(direct, { elapsedMs: 3000, autoLocked: false }).coord },
		{ risk: 3, coord: -3 }
	);
	assert.equal(scoreImpact(direct, { elapsedMs: 9000, autoLocked: false }).tempo, 3);
	assert.equal(scoreImpact(direct, { elapsedMs: 19000, autoLocked: false }).tempo, 1);
	assert.equal(scoreImpact(direct, { elapsedMs: 29000, autoLocked: false }).tempo, -1);
	assert.equal(scoreImpact(direct, { elapsedMs: 30000, autoLocked: true }).tempo, -3);

	const split = TARGETS.map((target, index) => ({ ...target, angle: 0, share: index < 2 ? 0.5 : 0 }));
	const score = scoreImpact(split, { elapsedMs: 12000, autoLocked: false });
	assert.equal(score.risk, -3);
	assert.equal(score.coord, 3);
});
