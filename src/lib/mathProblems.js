// Problem generators for Q52 — the math test whose difficulty is chosen by what
// the taker claimed in Q51.
//
// This module deliberately IMPORTS NOTHING: no $lib, no runes, no Svelte. That
// is what lets `node scripts/verify-math.js` import it directly and prove the
// stated answers are correct against numerical differentiation. Keep it pure.
//
// Every template's answer is an exact integer, so answers are compared exactly —
// see `parseTypedAnswer`.

/**
 * @typedef {Object} Problem
 * @property {string} id
 * @property {'easy'|'hard'|'brutal'} tier
 * @property {Record<string, number>} params
 * @property {string} promptText   plain-language statement
 * @property {string|null} mathml  MathML Core markup, or null for word problems
 * @property {string} plainMath    text form, used for the aria-label
 * @property {number} answer
 */

/* ------------------------------------------------------------------ helpers */

/** @param {() => number} rng @param {number} lo @param {number} hi inclusive */
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
/** @template T @param {() => number} rng @param {T[]} xs @returns {T} */
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];

// U+2212 MINUS SIGN — never an ASCII hyphen in rendered math.
const MINUS = '−';
const TIMES = '&#8290;'; // invisible times
const APPLY = '&#8289;'; // function application
// Chrome gives invisible-times zero width, so adjacent factors collide
// ("x⁴ln x"). A hair of explicit space is the difference between a formula and
// a smear. <mspace> is MathML Core; write the closing tag, not a self-closing
// form, so the verifier's tag-balance check stays meaningful.
const GAP = '<mspace width="0.17em"></mspace>';

/**
 * A signed term in a sum: emits the operator separately from the number so we
 * get `x² − 3x` rather than `x² + -3x`, and drops coefficients of 1.
 * @param {number} coef @param {string} body @param {boolean} first
 */
function term(coef, body, first) {
	if (coef === 0) return '';
	// A leading minus is unary, not binary: without lspace/rspace zeroed it
	// renders as "( − x²" with a gap after the sign.
	const sign =
		coef < 0
			? first
				? `<mo lspace="0" rspace="0">${MINUS}</mo>`
				: `<mo>${MINUS}</mo>`
			: first
				? ''
				: '<mo>+</mo>';
	const mag = Math.abs(coef);
	const num = mag === 1 && body ? '' : `<mn>${mag}</mn>${body ? TIMES : ''}`;
	return `${sign}${num}${body}`;
}

/**
 * The quadratic `a x² + b x + c`, sign-aware.
 * @param {number} a @param {number} b @param {number} c
 */
function polyML(a, b, c) {
	const parts = [
		term(a, '<msup><mi>x</mi><mn>2</mn></msup>', true),
		term(b, '<mi>x</mi>', a === 0),
		term(c, '', a === 0 && b === 0)
	].filter(Boolean);
	return parts.join('');
}

/** @param {number} a @param {number} b @param {number} c */
function polyText(a, b, c) {
	const t = /** @type {string[]} */ ([]);
	if (a) t.push(`${a === 1 ? '' : a === -1 ? '-' : a}x^2`);
	if (b) t.push(`${b > 0 && t.length ? '+ ' : ''}${b === 1 ? '' : b === -1 ? '-' : b}x`);
	if (c) t.push(`${c > 0 && t.length ? '+ ' : ''}${c}`);
	return t.join(' ') || '0';
}

/** Signed exponent for e^{kx} / x^k, as MathML. @param {number} k */
const expML = (k) =>
	k === 1
		? '<mi>x</mi>'
		: k === -1
			? `<mrow><mo>${MINUS}</mo><mi>x</mi></mrow>`
			: k < 0
				? `<mrow><mo>${MINUS}</mo><mn>${-k}</mn>${TIMES}<mi>x</mi></mrow>`
				: `<mrow><mn>${k}</mn>${TIMES}<mi>x</mi></mrow>`;

/** The `d²f/dx²` operator evaluated at a point. @param {number} at */
const leibnizML = (at) =>
	`<mfrac><mrow><msup><mi>d</mi><mn>2</mn></msup>${TIMES}<mi>f</mi></mrow>` +
	`<mrow><mi>d</mi>${TIMES}<msup><mi>x</mi><mn>2</mn></msup></mrow></mfrac>` +
	`<msub><mo stretchy="false">|</mo><mrow><mi>x</mi><mo>=</mo><mn>${at}</mn></mrow></msub>` +
	`<mo>=</mo><mo>?</mo>`;

/** @param {string} inner */
const mathBlock = (inner) => `<math display="block"><mrow>${inner}</mrow></math>`;

/* ------------------------------------------------------------- easy tier */

// Word problems. Each `N` is drawn from a set that forces a whole-number answer,
// so a taker never has to wonder whether to round.
const EASY = [
	{
		id: 'apples',
		// 0.5N + 0.5(0.9N) = 0.95N
		draw: (/** @type {() => number} */ rng) => ({ n: 20 * int(rng, 1, 10) }),
		answer: (/** @type {{n: number}} */ p) => (p.n / 20) * 19,
		text: (/** @type {{n: number}} */ p) =>
			`I bought ${p.n} apples. The next person bought 90% as many as I did. ` +
			`We each put half of ours into one basket. How many apples are in the basket?`
	},
	{
		id: 'cookies',
		// (N + 1.4N)/3 = 0.8N
		draw: (/** @type {() => number} */ rng) => ({ n: 5 * int(rng, 4, 30) }),
		answer: (/** @type {{n: number}} */ p) => (p.n / 5) * 4,
		text: (/** @type {{n: number}} */ p) =>
			`I baked ${p.n} cookies. My neighbour baked 40% more than I did. ` +
			`We each brought a third of ours to the bake sale. How many cookies were brought?`
	},
	{
		id: 'stickers',
		// 0.75N + (2/3)(0.75N) = 1.25N
		draw: (/** @type {() => number} */ rng) => ({ n: 4 * int(rng, 5, 40) }),
		answer: (/** @type {{n: number}} */ p) => (p.n / 4) * 5,
		text: (/** @type {{n: number}} */ p) =>
			`I have ${p.n} stickers. My sister has 25% fewer than me. ` +
			`I keep three quarters of mine and she keeps two thirds of hers. ` +
			`How many do we have left between us?`
	},
	{
		id: 'marbles',
		// 0.25(N + 0.6N + 0.3N) = 0.475N
		draw: (/** @type {() => number} */ rng) => ({ n: 40 * int(rng, 1, 5) }),
		answer: (/** @type {{n: number}} */ p) => (p.n / 40) * 19,
		text: (/** @type {{n: number}} */ p) =>
			`I have ${p.n} marbles. The second player has 60% of that many. ` +
			`The third has half as many as the second. We each put a quarter of ours into the pot. ` +
			`How many marbles are in the pot?`
	}
];

/* ------------------------------------------------------- derivative tiers */

// f(x) = (a x² + b x + c) · e^{kx} · sin(mx), asked at x = 0.
//
// With u = poly, v = e^{kx}, w = sin(mx):
//   f'' = u''vw + uv''w + uvw'' + 2u'v'w + 2u'vw' + 2uv'w'
// At x = 0, w(0) = 0 kills every term containing w, and w''(0) = 0 kills uvw'',
// leaving 2u'(0)v(0)w'(0) + 2u(0)v'(0)w'(0) = 2m(b + ck).
//
// `a` vanishes entirely — a deliberate trap: you must differentiate it and then
// watch it die.
const HARD = {
	id: 'sin-e-poly',
	evalAt: 0,
	draw: (/** @type {() => number} */ rng) => ({
		a: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]),
		b: int(rng, -5, 5),
		c: int(rng, -5, 5),
		k: pick(rng, [-2, -1, 1, 2, 3]),
		m: pick(rng, [2, 3, 4, 5])
	}),
	/** @param {{b: number, c: number, k: number, m: number}} p */
	answer: (p) => 2 * p.m * (p.b + p.c * p.k),
	/** @param {{a: number, b: number, c: number, k: number, m: number}} p */
	ok: (p) => {
		const ans = 2 * p.m * (p.b + p.c * p.k);
		// c*k === 0 would strand `a` AND `c`, leaving almost nothing to do.
		return ans !== 0 && Math.abs(ans) <= 400 && p.c * p.k !== 0;
	},
	/** @param {{a: number, b: number, c: number, k: number, m: number}} p */
	fn: (p) => (/** @type {number} */ x) =>
		(p.a * x * x + p.b * x + p.c) * Math.exp(p.k * x) * Math.sin(p.m * x),
	/** @param {{a: number, b: number, c: number, k: number, m: number}} p */
	mathml: (p) =>
		mathBlock(
			`<mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo>` +
				`<mo stretchy="false">(</mo>${polyML(p.a, p.b, p.c)}<mo stretchy="false">)</mo>${TIMES}${GAP}` +
				`<msup><mi>e</mi>${expML(p.k)}</msup>${TIMES}${GAP}` +
				`<mi>sin</mi>${APPLY}<mo stretchy="false">(</mo><mn>${p.m}</mn>${TIMES}<mi>x</mi><mo stretchy="false">)</mo>`
		) + mathBlock(leibnizML(0)),
	/** @param {{a: number, b: number, c: number, k: number, m: number}} p */
	plain: (p) => `f(x) = (${polyText(p.a, p.b, p.c)}) e^(${p.k}x) sin(${p.m}x); find f''(0)`
};

// f(x) = (a x² + b x + c) · x^k · ln x, asked at x = 1.
//
// At x = 1: ln(1) = 0, L'(1) = 1, L''(1) = -1; and p = x^k gives p(1) = 1,
// p'(1) = k. Terms containing ln(1) die, leaving
//   f''(1) = u(1)L''(1)p(1) + 2u'(1)L'(1)p(1) + 2u(1)L'(1)p'(1)
//          = -(a+b+c) + 2(2a+b) + 2k(a+b+c)
//          = (a+b+c)(2k-1) + 2(2a+b)
//
// Nastier than HARD structurally, not just longer: the evaluation point is not
// 0, so nothing vanishes for free; `a` survives and appears twice; and it needs
// the power rule on top of the triple product rule.
const BRUTAL = {
	id: 'xk-lnx',
	evalAt: 1,
	draw: (/** @type {() => number} */ rng) => ({
		a: int(rng, -5, 5),
		b: int(rng, -5, 5),
		c: int(rng, -5, 5),
		k: int(rng, 2, 6)
	}),
	/** @param {{a: number, b: number, c: number, k: number}} p */
	answer: (p) => (p.a + p.b + p.c) * (2 * p.k - 1) + 2 * (2 * p.a + p.b),
	/** @param {{a: number, b: number, c: number, k: number}} p */
	ok: (p) => {
		const s = p.a + p.b + p.c;
		const ans = s * (2 * p.k - 1) + 2 * (2 * p.a + p.b);
		return s !== 0 && ans !== 0 && Math.abs(ans) <= 600;
	},
	/** @param {{a: number, b: number, c: number, k: number}} p */
	fn: (p) => (/** @type {number} */ x) =>
		(p.a * x * x + p.b * x + p.c) * Math.pow(x, p.k) * Math.log(x),
	/** @param {{a: number, b: number, c: number, k: number}} p */
	mathml: (p) =>
		mathBlock(
			`<mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo>` +
				`<mo stretchy="false">(</mo>${polyML(p.a, p.b, p.c)}<mo stretchy="false">)</mo>${TIMES}${GAP}` +
				`<msup><mi>x</mi><mn>${p.k}</mn></msup>${TIMES}${GAP}` +
				`<mi>ln</mi>${APPLY}<mi>x</mi>`
		) + mathBlock(leibnizML(1)),
	/** @param {{a: number, b: number, c: number, k: number}} p */
	plain: (p) => `f(x) = (${polyText(p.a, p.b, p.c)}) x^${p.k} ln x; find f''(1)`
};

/** Exported so the verifier checks the real code rather than a copy of it. */
export const TEMPLATES = { easy: EASY, hard: HARD, brutal: BRUTAL };

/* ------------------------------------------------------------------- api */

/**
 * @param {number|null|undefined} rating 1–7 self-rating from Q51
 * @returns {'easy'|'hard'|'brutal'}
 */
export function tierForRating(rating) {
	// A missing rating means the taker deep-linked past Q51. Never guess a hard
	// tier from no evidence — fall back to easy, the same contract patienceMode()
	// honours for a missing patience value.
	if (typeof rating !== 'number') return 'easy';
	if (rating >= 7) return 'brutal';
	if (rating >= 5) return 'hard';
	return 'easy';
}

/**
 * Rejection sampling with a watchdog — an over-tight constraint should fail
 * loudly rather than hang the component mount.
 * @template T
 * @param {() => T} draw @param {(p: T) => boolean} ok @param {string} id
 */
function drawValid(draw, ok, id) {
	for (let i = 0; i < 200; i++) {
		const p = draw();
		if (ok(p)) return p;
	}
	throw new Error(`mathProblems: could not draw a valid "${id}" in 200 attempts`);
}

/**
 * @param {number|null|undefined} rating
 * @param {() => number} [rng]
 * @returns {Problem}
 */
export function makeProblem(rating, rng = Math.random) {
	const tier = tierForRating(rating);

	if (tier === 'easy') {
		const t = pick(rng, EASY);
		const params = drawValid(
			() => t.draw(rng),
			// Guard against a taker who mis-simplifies to "nothing changed" and is
			// accidentally right.
			(p) => {
				const ans = t.answer(p);
				return ans !== p.n && ans !== p.n / 2;
			},
			t.id
		);
		return {
			id: t.id,
			tier,
			params,
			promptText: t.text(params),
			mathml: null,
			plainMath: '',
			answer: t.answer(params)
		};
	}

	const t = tier === 'brutal' ? BRUTAL : HARD;
	const params = drawValid(
		() => t.draw(rng),
		// @ts-ignore — each template's ok() matches its own draw() shape
		(p) => t.ok(p),
		t.id
	);
	return {
		id: t.id,
		tier,
		params,
		promptText: 'Differentiate twice and evaluate.',
		// @ts-ignore
		mathml: t.mathml(params),
		// @ts-ignore
		plainMath: t.plain(params),
		// @ts-ignore
		answer: t.answer(params)
	};
}

/**
 * Strict integer parsing. Deliberately NOT `Number(raw)`, which accepts "0x10",
 * "1e3", "Infinity", and turns "" into 0 — and 0 is a plausible answer here.
 * @param {string} raw
 * @returns {number|null} null when unparseable or empty
 */
export function parseTypedAnswer(raw) {
	if (typeof raw !== 'string') return null;
	const s = raw
		.normalize('NFKC') // full-width digits and minus fold to ASCII
		.replace(/[\s  ]/g, '') // spaces, nbsp, narrow nbsp
		.replace(/[−‒–—―⁃]/g, '-') // unicode minus & dashes
		.replace(/[, ']/g, ''); // thousands separators
	if (s === '') return null;
	if (!/^[+-]?\d+$/.test(s)) return null;
	const n = Number(s);
	return Number.isSafeInteger(n) ? n : null;
}

/**
 * @param {string} raw
 * @param {Problem} problem
 */
export function isCorrect(raw, problem) {
	const n = parseTypedAnswer(raw);
	// -0 === 0 is true, so no special case needed.
	return n !== null && n === problem.answer;
}
