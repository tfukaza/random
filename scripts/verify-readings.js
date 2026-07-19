// Enforces the mechanical house rules for the 128 readings (src/lib/readings.js)
// against the blurbs in src/lib/personalities.js.
//
//   node scripts/verify-readings.js
//
// readings.js imports nothing, so it is imported directly. personalities.js
// imports $lib modules that plain node cannot resolve, so its keys and blurbs
// are extracted textually — the entry format is rigid enough (tab KEY colon,
// newline, tabs, single-quoted string) for that to be reliable.

import { readFileSync } from 'node:fs';
import { READINGS } from '../src/lib/readings.js';

const personalitiesSrc = readFileSync(new URL('../src/lib/personalities.js', import.meta.url), 'utf8');
const blurbs = /** @type {Record<string, string>} */ ({});
for (const m of personalitiesSrc.matchAll(/^\t([A-Z]{7}):\n\t\t'(.+)',?$/gm)) blurbs[m[1]] = m[2];

let failures = 0;
/** @param {string} what @param {unknown} detail */
function fail(what, detail) {
	failures++;
	console.log(`  FAIL ${what}`, detail);
}

// ── completeness: exactly the same 128 keys ────────────────────────────────
const bKeys = Object.keys(blurbs);
const rKeys = Object.keys(READINGS);
if (bKeys.length !== 128) fail('blurb extraction found wrong count', bKeys.length);
for (const k of bKeys) if (!(k in READINGS)) fail('missing reading', k);
for (const k of rKeys) if (!(k in blurbs)) fail('reading for unknown code', k);

// ── per-reading rules ──────────────────────────────────────────────────────
const BANNED = [
	'extrovert',
	'introvert',
	'dishonest',
	'pragmatic',
	'big-picture',
	'detail-oriented',
	'risk-taker',
	'team-player',
	'lone wolf',
	'quick-action',
	'axis',
	'axes',
	'parameter',
	'trait'
];

const words = (/** @type {string} */ s) => s.trim().split(/\s+/).filter(Boolean);

for (const [code, text] of Object.entries(READINGS)) {
	const n = words(text).length;
	if (n < 45 || n > 80) fail(`word count ${n}`, code);
	const lower = text.toLowerCase();
	for (const b of BANNED) {
		// word-boundary match so "honestly kept" (prose) never trips "honest"-family jargon
		if (new RegExp(`\\b${b.replace('-', '[-\\s]')}\\b`).test(lower)) fail(`banned word "${b}"`, code);
	}
	if (blurbs[code] && (text.includes(blurbs[code]) || blurbs[code].includes(text)))
		fail('reading duplicates its blurb', code);
}

// ── openings distinct within each noun group ───────────────────────────────
// A group is the 8 codes sharing letters 3–5 and 7 (creative/risk/scope/coord).
/** @type {Record<string, Record<string, string[]>>} */
const groups = {};
for (const code of rKeys) {
	const g = code[2] + code[3] + code[4] + code[6];
	const first = words(READINGS[code])[0].toLowerCase().replace(/[^a-z’']/g, '');
	((groups[g] ??= {})[first] ??= []).push(code);
}
for (const [g, firsts] of Object.entries(groups)) {
	for (const [w, codes] of Object.entries(firsts)) {
		if (codes.length > 1) fail(`group ${g} shares opening "${w}"`, codes.join(', '));
	}
}

console.log(
	failures === 0
		? `PASS — ${rKeys.length} readings verified (counts, vocabulary, openings, no blurb reuse)`
		: `\nFAIL — ${failures} problem(s)`
);
process.exit(failures === 0 ? 0 : 1);
