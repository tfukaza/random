// Reads an arbitrary question out of the DOM and hands back (a) the whole thing
// as one spoken sentence and (b) a way to answer it with a single number.
//
// This exists because PatienceLens is content-agnostic — it holds an opaque
// snippet, not a question object, and questions share no schema. So the only
// thing they genuinely have in common is their rendered markup, and that is what
// we read.
//
// Answering DRIVES THE QUESTION'S OWN CONTROLS rather than inventing a score:
// we click the real card, or set the real slider and press its real Next. Every
// question therefore scores exactly as it would unlensed — per-option deltas,
// ledger writes, cross-checks and all.
//
// Everything here fails open. If a question can't be read or can't be driven,
// the caller un-stows it and the taker answers it normally. Stranding someone in
// front of a text box that cannot commit is the one unacceptable outcome.
import { tick } from 'svelte';

/**
 * @typedef {{ w: string, hold?: number, tone?: 'num' | 'body' | 'chunk' }} Token
 * @typedef {{
 *   kind: 'cards' | 'slider' | 'integer',
 *   tokens: Token[],
 *   sentence: string,
 *   hint: string,
 *   parse: (raw: string) => number | null,
 *   validate: (n: number) => boolean,
 *   answer: (n: number) => Promise<boolean>
 * }} Adapter
 */

const SPELLED = [
	'ZERO',
	'ONE',
	'TWO',
	'THREE',
	'FOUR',
	'FIVE',
	'SIX',
	'SEVEN',
	'EIGHT',
	'NINE',
	'TEN'
];
/** @param {number} n */
const spell = (n) => SPELLED[n] ?? String(n);

/** @param {string | null | undefined} s */
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Prefer aria-label: SplitText puts the exact source string there, unsplit. */
const label = (/** @type {Element} */ el) => clean(el.getAttribute('aria-label') ?? el.textContent);

// Anything this long is a formula or a compound — showing it one whitespace-run
// at a time is illegible, so it gets held whole.
const CHUNK_CHARS = 12;

/**
 * Split prose into word tokens, but keep long/atomic strings whole.
 * @param {string} s @param {Token['tone']} [tone]
 * @returns {Token[]}
 */
function words(s, tone = 'body') {
	const out = /** @type {Token[]} */ ([]);
	for (const w of clean(s).split(' ')) {
		if (!w) continue;
		if (w.length > CHUNK_CHARS) out.push({ w, tone: 'chunk' });
		else out.push({ w, tone });
	}
	return out;
}

/**
 * The narrative parts of a question, in document order: every SplitText block
 * (premise, prompt), plus the readable description of anything that is
 * otherwise purely visual — a rendered formula, an illustrative SVG. Without
 * the last of those, a question like the circle illusion isn't hard, it's
 * unanswerable.
 * @param {HTMLElement} host
 */
function narrative(host) {
	const sel = 'span.split, [role="math"][aria-label], svg[role="img"][aria-label]';
	return [...host.querySelectorAll(sel)].map(label).filter(Boolean);
}

/** @param {HTMLElement} host */
const nextButton = (host) => /** @type {HTMLButtonElement|null} */ (host.querySelector('button.next'));

/** Strict integer parse — no `1e3`, no `0x10`, and `''` must not become 0. */
export function parseInteger(/** @type {string} */ raw) {
	const s = String(raw ?? '')
		.normalize('NFKC')
		.replace(/[\s  ]/g, '')
		.replace(/[−‒–—―]/g, '-');
	if (!/^[+-]?\d+$/.test(s)) return null;
	const n = Number(s);
	return Number.isSafeInteger(n) ? n : null;
}

/**
 * @param {HTMLElement} host
 * @returns {Adapter | null}
 */
export function readQuestion(host) {
	const body = narrative(host);

	/* ------------------------------------------------------------- slider */
	const range = /** @type {HTMLInputElement|null} */ (host.querySelector('input[type="range"]'));
	if (range) {
		const min = Number(range.min || 0);
		const max = Number(range.max || 10);
		const step = Number(range.step || 1) || 1;
		// Pole labels carry their own "1 — " prefix, which would otherwise be
		// narrated as "one means one I like it when my life is easy".
		const poles = [...host.querySelectorAll('.pole')].map((p) =>
			clean(p.textContent).replace(/^\s*\d+\s*[—–-]\s*/, '')
		);

		const instruction =
			`Answer with a number from ${spell(min)} to ${spell(max)}` +
			(poles.length === 2 ? `, where ${spell(min)} means ${poles[0]}, and ${spell(max)} means ${poles[1]}.` : '.');

		const tokens = [...body.flatMap((b) => words(b)), ...words(instruction)];
		return {
			kind: 'slider',
			tokens,
			sentence: [...body, instruction].join(' '),
			hint: `A number from ${min} to ${max}`,
			parse: parseInteger,
			validate: (n) => n >= min && n <= max && (n - min) % step === 0,
			answer: async (n) => {
				range.value = String(n);
				// bind:value listens for `input`; `change` keeps any onchange happy.
				range.dispatchEvent(new Event('input', { bubbles: true }));
				range.dispatchEvent(new Event('change', { bubbles: true }));
				await tick();
				const go = nextButton(host);
				if (!go || go.disabled) return false;
				go.click();
				return true;
			}
		};
	}

	/* ------------------------------------------------------------ integer */
	const numeric = /** @type {HTMLInputElement|null} */ (
		host.querySelector('input[inputmode="numeric"]')
	);
	if (numeric) {
		const instruction = 'Type your answer as a number.';
		return {
			kind: 'integer',
			tokens: [...body.flatMap((b) => words(b)), ...words(instruction)],
			sentence: [...body, instruction].join(' '),
			hint: 'A number',
			parse: parseInteger,
			validate: () => true,
			answer: async (n) => {
				numeric.value = String(n);
				numeric.dispatchEvent(new Event('input', { bubbles: true }));
				// Load-bearing: the submit button is disabled off a $derived of the
				// input. Clicking before Svelte flushes hits a disabled button and
				// silently does nothing at all.
				await tick();
				const go = nextButton(host);
				if (go && !go.disabled) {
					go.click();
					return true;
				}
				// The question also commits on Enter — belt and braces.
				numeric.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
				return true;
			}
		};
	}

	/* -------------------------------------------------------------- cards */
	// Captured ONCE: the sentence and the click target must come from the same
	// list in the same order, or labels and indices drift apart.
	let cards = /** @type {HTMLButtonElement[]} */ ([...host.querySelectorAll('button.card')]);
	if (cards.length < 2) {
		cards = /** @type {HTMLButtonElement[]} */ ([
			...host.querySelectorAll('button:not(.next):not(.ghost):not(.flat)')
		]);
	}
	if (cards.length < 2) return null;

	// PickList wraps its text in `.label`; other card users don't.
	const labels = cards.map((c) => clean((c.querySelector('.label') ?? c).textContent));

	/** @type {Token[]} */
	const optionTokens = [];
	labels.forEach((text, i) => {
		// Spelled, tinted, and held far longer than prose: at 40ms a bare "3." is
		// gone before it registers, and these are the only tokens the taker MUST
		// retain in order to answer at all.
		optionTokens.push({ w: `${spell(i + 1)}.`, tone: 'num', hold: 3 });
		optionTokens.push(...words(text));
	});

	const lead = 'Your options are:';
	const instruction = 'Type the number.';
	return {
		kind: 'cards',
		tokens: [
			...body.flatMap((b) => words(b)),
			...words(lead),
			...optionTokens,
			...words(instruction)
		],
		sentence: [...body, lead, ...labels.map((l, i) => `${i + 1}. ${l}`), instruction].join(' '),
		hint: `A number from 1 to ${cards.length}`,
		parse: parseInteger,
		validate: (n) => n >= 1 && n <= cards.length,
		answer: async (n) => {
			const card = cards[n - 1];
			if (!card || card.disabled) return false;
			card.click();
			return true;
		}
	};
}
