// Proves the answers in src/lib/mathProblems.js are actually correct.
//
// The repo has no test framework and doesn't need one, but the hard tier of Q52
// is worthless if its stated answer is wrong — and a hand-derived second
// derivative is exactly the kind of thing that is wrong. So: check the analytic
// answers against numerical differentiation, over thousands of seeded draws.
//
//   node scripts/verify-math.js [seed]
//
// Exits non-zero on any failure, and prints the offending params so a failure is
// reproducible.

import {
	TEMPLATES,
	makeProblem,
	parseTypedAnswer,
	isCorrect,
	tierForRating
} from '../src/lib/mathProblems.js';

const DRAWS = 5000;
const seed = Number(process.argv[2] ?? 1);

/** Mulberry32 — deterministic, so any failure can be replayed. @param {number} s */
function rngFrom(s) {
	let a = s >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Second derivative by central difference, Richardson-extrapolated twice.
 * The plain difference has error O(h²) in even powers only, so each level of
 * (4·finer − coarser)/3 style extrapolation cancels the next term.
 *
 * h starts at 1e-2, NOT something tiny: the 1/h² divisor amplifies
 * floating-point cancellation, so a "more accurate" h = 1e-6 is dramatically
 * worse than this.
 * @param {(x: number) => number} f @param {number} x
 */
function d2(f, x) {
	const D = (/** @type {number} */ h) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
	const h = 1e-2;
	const a = D(h);
	const b = D(h / 2);
	const c = D(h / 4);
	const r1 = (4 * b - a) / 3; // kills h²
	const r2 = (4 * c - b) / 3;
	return (16 * r2 - r1) / 15; // kills h⁴
}

let failures = 0;
/** @param {string} what @param {unknown} detail */
function fail(what, detail) {
	failures++;
	if (failures <= 8) console.log(`  FAIL ${what}`, JSON.stringify(detail));
}

/* ------------------------------------------- derivative templates: algebra */

for (const t of [TEMPLATES.hard, TEMPLATES.brutal]) {
	const rng = rngFrom(seed);
	let worst = 0;
	let checked = 0;
	let attempts = 0;

	while (checked < DRAWS) {
		if (++attempts > DRAWS * 50) {
			fail(`${t.id}: rejection sampling never converged`, { attempts });
			break;
		}
		const p = t.draw(rng);
		if (!t.ok(p)) continue;
		checked++;

		const expected = t.answer(p);
		const numeric = d2(t.fn(p), t.evalAt);
		const err = Math.abs(numeric - expected);
		const tol = 1e-6 * Math.max(1, Math.abs(expected));
		if (!(err <= tol)) fail(`${t.id} answer mismatch`, { p, expected, numeric, err });
		worst = Math.max(worst, err);

		if (!Number.isSafeInteger(expected)) fail(`${t.id} non-integer answer`, { p, expected });

		// MathML sanity: balanced, and nothing outside MathML Core.
		const ml = t.mathml(p);
		const open = (ml.match(/<m[a-z]+[\s>]/g) || []).length;
		const close = (ml.match(/<\/m[a-z]+>/g) || []).length;
		if (open !== close) fail(`${t.id} unbalanced MathML`, { p, open, close });
		if (/<mfenced|<mstyle/.test(ml)) fail(`${t.id} non-Core MathML element`, { p });
		if (/-\d/.test(ml.replace(/&#\d+;/g, ''))) fail(`${t.id} ASCII hyphen in math`, { p, ml });
	}
	console.log(
		`${t.id.padEnd(12)} ${checked} draws  worst error ${worst.toExponential(2)}  (accept ${((checked / attempts) * 100).toFixed(0)}%)`
	);
}

/* ------------------------------------ easy templates: exact integer checks */

for (const t of TEMPLATES.easy) {
	const rng = rngFrom(seed);
	let checked = 0;
	for (let i = 0; i < 400; i++) {
		const p = t.draw(rng);
		const ans = t.answer(p);
		checked++;
		// Verified with integer arithmetic on purpose — `0.95 * n` in floats is
		// the very thing being proven safe, so it must not appear in the check.
		const expect = {
			apples: (p.n / 20) * 19,
			cookies: (p.n / 5) * 4,
			stickers: (p.n / 4) * 5,
			marbles: (p.n / 40) * 19
		}[t.id];
		if (!Number.isInteger(ans)) fail(`${t.id} non-integer answer`, { p, ans });
		if (ans !== expect) fail(`${t.id} answer mismatch`, { p, ans, expect });
		// And cross-check against the float arithmetic the wording describes.
		const viaFloat = {
			apples: 0.5 * p.n + 0.5 * (0.9 * p.n),
			cookies: (p.n + 1.4 * p.n) / 3,
			stickers: 0.75 * p.n + (2 / 3) * (0.75 * p.n),
			marbles: 0.25 * (p.n + 0.6 * p.n + 0.3 * p.n)
		}[t.id];
		if (Math.abs(viaFloat - ans) > 1e-9) fail(`${t.id} wording ≠ answer`, { p, ans, viaFloat });
	}
	console.log(`${t.id.padEnd(12)} ${checked} draws  exact integer arithmetic ok`);
}

/* --------------------------------------------------- tiering + parser API */

for (const [rating, want] of /** @type {Array<[any, string]>} */ ([
	[null, 'easy'],
	[undefined, 'easy'],
	[1, 'easy'],
	[4, 'easy'],
	[5, 'hard'],
	[6, 'hard'],
	[7, 'brutal']
])) {
	const got = tierForRating(rating);
	if (got !== want) fail('tierForRating', { rating, got, want });
}

const rng = rngFrom(seed + 99);
for (const rating of [2, 5, 7, null]) {
	for (let i = 0; i < 200; i++) {
		const p = makeProblem(rating, rng);
		const a = p.answer;
		// Accepted forms.
		for (const form of [String(a), ` ${a} `, `+${a}`.replace('+-', '-'), String(a).replace('-', '−')]) {
			if (!isCorrect(form, p)) fail('parser rejected a valid form', { form, a });
		}
		// Rejected forms.
		for (const bad of ['', '   ', 'abc', '1e3', '0x10', String(a) + '.5', String(a + 1)]) {
			if (isCorrect(bad, p)) fail('parser accepted a bad form', { bad, a });
		}
		if (parseTypedAnswer('') !== null) fail('empty string must not parse as 0', {});
		if (p.tier !== 'easy' && !p.mathml) fail('derivative problem missing MathML', { tier: p.tier });
		if (p.tier === 'easy' && p.mathml) fail('word problem should have no MathML', {});
	}
}
console.log('tiering + parser  ok');

console.log(failures === 0 ? '\nPASS — all templates verified' : `\nFAIL — ${failures} problem(s)`);
process.exit(failures === 0 ? 0 : 1);
