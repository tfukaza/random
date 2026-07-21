// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {
	COLS,
	DISTRACTORS,
	DOOR_COLOUR,
	EVENTS,
	NUMBERED,
	PEOPLE,
	PROP_INSCRIPTIONS,
	PROBES,
	PROPS,
	ROWS,
	SIGN_TEXT,
	at,
	personAt,
	probeFor,
	prop
} from './sceneModel.js';

// A choice option's label resolves back to the prop it refers to, if any. Used
// to prove a "phantom" option really points at empty air.
const labelledProp = (label) => PROPS.find((p) => p.article === label) ?? null;

// The scene is only honest if what a probe claims is true of it actually is
// true of it. Clicking through the question can never surface a wrong answer
// key — it renders happily either way — so these are the tests that matter.

test('no two props share a cell, or "directly below" is ambiguous', () => {
	const seen = new Map();
	for (const p of PROPS) {
		const key = p.cell.join(',');
		assert.equal(seen.has(key), false, `${p.id} and ${seen.get(key)} both sit at ${key}`);
		seen.set(key, p.id);
	}
});

test('every prop is inside the grid it is placed on', () => {
	for (const p of PROPS) {
		const [col, row] = p.cell;
		assert.ok(col >= 0 && col < COLS, `${p.id} col ${col} is off the grid`);
		assert.ok(row >= 0 && row < ROWS, `${p.id} row ${row} is off the grid`);
	}
});

test('the spatial probe is a tap-on-people canvas', () => {
	assert.equal(PROBES.spatial.format, 'pinpoint');
	assert.equal(PROBES.spatial.options, undefined, 'pinpoint is scored by the tap, not options');
	assert.match(PROBES.spatial.prompt, /people/i);
});

test('every person is a rectangle inside the scene frame', () => {
	assert.ok(PEOPLE.length >= 2, 'need at least two people to choose between');
	for (const p of PEOPLE) {
		assert.ok(p.w > 0 && p.h > 0, `${p.id} has no area`);
		assert.ok(p.x >= 0 && p.x + p.w <= 500, `${p.id} runs off the 500-wide frame`);
		assert.ok(p.y >= 0 && p.y + p.h <= 400, `${p.id} runs off the 400-tall frame`);
	}
});

test('the people rectangles do not overlap — a tap is one person or none', () => {
	for (let i = 0; i < PEOPLE.length; i++) {
		for (let j = i + 1; j < PEOPLE.length; j++) {
			const a = PEOPLE[i];
			const b = PEOPLE[j];
			const disjoint = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
			assert.ok(disjoint, `${a.id} and ${b.id} overlap`);
		}
	}
});

test('personAt hits inside a figure and misses empty ground', () => {
	// The centre of each rectangle lands on that person, a pixel outside any edge
	// does not. (Not "left of the box" — the people stand adjacent, so left of one
	// can be another; just outside a corner is unambiguous empty ground.)
	for (const p of PEOPLE) {
		assert.equal(personAt(p.x + p.w / 2, p.y + p.h / 2)?.id, p.id, `centre of ${p.id} should hit`);
		assert.equal(personAt(p.x + p.w / 2, p.y - 3) ?? null, null, `just above ${p.id} should miss`);
	}
	const inAny = (/** @type {number} */ x, /** @type {number} */ y) =>
		PEOPLE.some((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
	for (const [x, y] of [
		[5, 5], // sky
		[490, 30], // sky
		[250, 380] // road
	]) {
		assert.ok(!inAny(x, y), `test point (${x},${y}) is not actually empty ground`);
		assert.equal(personAt(x, y), null, `(${x},${y}) is empty ground but registered a hit`);
	}
});

test('working real options are exactly the numbered props, phantoms carry no number', () => {
	assert.ok(NUMBERED.length >= 2, 'need at least two numbered props for a real choice');
	for (const p of NUMBERED) assert.match(String(p.number), /^[1-9]$/);
	const opts = PROBES.working.options;
	for (const o of opts) {
		const p = labelledProp(o.label);
		assert.ok(p, `working option "${o.label}" is not a prop in the scene`);
		// The whole test: correct ⇔ the object actually bore a number.
		assert.equal(o.correct, p.number !== undefined, `${p.id}'s correctness disagrees with its number`);
	}
	assert.ok(opts.some((o) => o.correct), 'no numbered object to pick');
	assert.ok(opts.some((o) => !o.correct), 'no letters-only trap');
});

test('integrated inscriptions collectively contain every digit from 0 through 9', () => {
	const digits = new Set(Object.values(PROP_INSCRIPTIONS).join('').match(/\d/g) ?? []);
	assert.deepEqual([...digits].sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
	assert.deepEqual(NUMBERED.map((p) => p.number), [4, 6, 9]);
});

test('semantic has exactly one correct sign, decoys are near-misses', () => {
	const opts = PROBES.semantic.options;
	const correct = opts.filter((o) => o.correct);
	assert.equal(correct.length, 1);
	assert.equal(correct[0].label, SIGN_TEXT);
	for (const o of opts) {
		if (o.correct) continue;
		assert.notEqual(o.label, SIGN_TEXT);
		assert.ok(
			Math.abs(o.label.length - SIGN_TEXT.length) <= 4,
			`"${o.label}" is too far from the real sign to be a near-miss`
		);
	}
});

test('the episodic answer is the events in their scheduled order', () => {
	const scheduled = [...EVENTS].sort((a, b) => a.at - b.at).map((e) => e.id);
	assert.deepEqual(PROBES.episodic.answer, scheduled);
	// Distinct times, or "the order they happened" has no single right answer.
	assert.equal(new Set(EVENTS.map((e) => e.at)).size, EVENTS.length);
	for (const e of EVENTS) assert.ok(e.at > 0 && e.at < 1, `${e.id} fires outside the window`);
	assert.deepEqual(
		PROBES.episodic.items.map((i) => i.id).sort(),
		EVENTS.map((e) => e.id).sort()
	);
});

test('the episodic list is NOT presented already in the right order', () => {
	// RankList renders items in the order it is given them. Handing it the answer
	// would turn "put these back in order" into "press Next".
	const presented = PROBES.episodic.items.map((i) => i.id);
	assert.notDeepEqual(presented, PROBES.episodic.answer, 'the list arrives already solved');
	// Nor should it be exactly reversed, which is just as guessable.
	assert.notDeepEqual(presented, [...PROBES.episodic.answer].reverse());
	// And the first item must not already be first.
	assert.notEqual(presented[0], PROBES.episodic.answer[0]);
});

test('the prospective answer is the door colour and appears once among its options', () => {
	const correct = PROBES.prospective.options.filter((o) => o.correct);
	assert.equal(correct.length, 1);
	assert.equal(correct[0].label, DOOR_COLOUR);
	assert.equal(PROBES.prospective.options.length, 5);
});

test('probeFor: faculty picks the probe, difficulty picks the tier', () => {
	// Normal tier (middle difficulty, or none given).
	assert.equal(probeFor('spatial', false, 4).key, 'spatial');
	assert.equal(probeFor('working', false, 5).key, 'working');
	assert.equal(probeFor('semantic', false).key, 'semantic');
	assert.equal(probeFor('episodic', false, 3).key, 'episodic');

	// Easy life (≤ 2) → the easy variant of whatever faculty was named.
	assert.equal(probeFor('spatial', false, 1).key, 'spatial_easy');
	assert.equal(probeFor('working', false, 2).key, 'working_easy');
	assert.equal(probeFor('semantic', false, 1).key, 'semantic_easy');
	assert.equal(probeFor('episodic', false, 2).key, 'episodic_easy');

	// "Bad at all of them" → easy tier, defaulting to the spatial faculty.
	assert.equal(probeFor('none', false, 5).key, 'spatial_easy');

	// Hard life (7) or a strong claim → recreate, regardless of faculty.
	assert.equal(probeFor('spatial', false, 7).key, 'recreate');
	assert.equal(probeFor('episodic', false, 7).key, 'recreate');
	assert.equal(probeFor(null, true, 4).key, 'recreate');
	assert.equal(probeFor('working', true, 1).key, 'recreate'); // strong claim beats easy life

	// Deep-links: no type, no difficulty → normal spatial.
	assert.equal(probeFor(null, false).key, 'spatial');
	assert.equal(probeFor('nonsense', false).key, 'spatial');
});

test('easy variants keep phantom traps, sourced from things not in the scene', () => {
	const articles = new Set(PROPS.map((p) => p.article));
	// Every distractor is genuinely absent from the scene.
	for (const d of DISTRACTORS) assert.equal(articles.has(d), false, `${d} is actually a prop`);

	// spatial_easy: real objects are real props; phantoms are distractors.
	for (const o of PROBES.spatial_easy.options) {
		if (o.correct) assert.ok(articles.has(o.label), `${o.label} is marked real but is not a prop`);
		else assert.ok(DISTRACTORS.includes(o.label), `${o.label} is a phantom but not a distractor`);
	}
	assert.ok(PROBES.spatial_easy.options.some((o) => !o.correct), 'no phantom on the easy path');

	// working_easy: only props with one featured standalone number are correct.
	for (const o of PROBES.working_easy.options) {
		const p = labelledProp(o.label);
		assert.ok(p, `${o.label} is not a prop`);
		assert.equal(o.correct, p.number !== undefined, `${p.id}'s easy correctness disagrees with its number`);
	}

	// episodic_easy: exactly the earliest event is correct.
	const first = [...EVENTS].sort((a, b) => a.at - b.at)[0];
	const correct = PROBES.episodic_easy.options.filter((o) => o.correct);
	assert.equal(correct.length, 1);
	assert.equal(correct[0].label, first.label);
});

test('count is gone and recreate exists', () => {
	assert.equal(PROBES.count, undefined, 'the head-count probe was replaced by recreate');
	assert.equal(PROBES.recreate.format, 'recreate');
});

test('every probe is well-formed for its format', () => {
	for (const [key, probe] of Object.entries(PROBES)) {
		assert.ok(probe.prompt?.length > 10, `${key} has no real prompt`);
		if (probe.format === 'choice') {
			assert.ok(probe.options.length >= 4, `${key} needs enough options to be a test`);
			assert.ok(probe.options.some((o) => o.correct), `${key} has no correct option`);
			const labels = probe.options.map((o) => o.label);
			assert.equal(new Set(labels).size, labels.length, `${key} repeats an option`);
		} else if (probe.format === 'digits') {
			assert.ok(probe.answer, `${key} has no answer`);
		} else if (probe.format === 'order') {
			assert.ok(Array.isArray(probe.answer) && probe.items?.length, `${key} is missing order data`);
		} else if (probe.format === 'recreate') {
			assert.equal(probe.options, undefined, 'recreate is scored by placement, not options');
		}
	}
});

test('prop() and at() agree about where things are', () => {
	for (const p of PROPS) assert.equal(at(...p.cell).id, p.id);
	assert.throws(() => prop('unicorn'), /no prop/);
	assert.equal(at(COLS + 5, 0), null);
});
