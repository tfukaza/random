// The reveal cascade: one clock that decides when each part of a question
// arrives, so the whole card assembles in a readable order instead of every
// block fading in at once.
//
// The rule that motivates all of it: **an action button may not appear until
// everything above it has finished arriving.** Otherwise "Submit" is sitting
// there, fully legible, while the taker is still reading the question — which
// both spoils the reveal and invites answering something you haven't read.
//
// Two clocks are tracked, and the distinction is the whole point:
//   `t`   — when the NEXT block starts. Blocks overlap slightly so the card
//           feels continuous rather than staccato.
//   `end` — when everything staged so far has genuinely FINISHED. Action
//           buttons key off this, never off `t`.
//
// Everything is expressed in milliseconds at normal speed. PatienceLens scales
// the resulting CSS animations wholesale via playbackRate, so nothing here
// needs to know about the patience band.

/** Stagger between words of a text block. */
export const WORD_MS = 75;
/** Stagger between sibling items (option cards, chips, rank rows). */
export const ITEM_MS = 80;
/** How long a single element takes to fade/rise into place (`rise`). */
export const FADE_MS = 420;
/** How long a horizontal rule takes to draw (`draw`). */
export const RULE_MS = 400;
/** Breathing room before the action row. */
export const GAP_MS = 140;
/** How much a block may overlap the previous one. Keeps it from feeling stiff. */
const OVERLAP_MS = 260;

/** @param {string} s */
const wordCount = (s) => (String(s ?? '').trim().match(/\S+/g) ?? []).length;

/**
 * Total time a text block needs, start to finish — useful for components that
 * animate text themselves and need to know when it lands.
 * @param {string} s
 * @param {number} [stagger]
 */
export function textMs(s, stagger = WORD_MS) {
	return Math.max(0, wordCount(s) - 1) * stagger + FADE_MS;
}

/**
 * Build a cascade. Each method returns the delay (ms) at which that block
 * should START, and advances the clock.
 * @param {number} [start]
 */
export function cascade(start = 0) {
	let t = start;
	let end = start;

	/** @param {number} span time from the block's start to its last child starting @param {number} dur */
	const push = (span, dur) => {
		const at = t;
		end = Math.max(end, at + span + dur);
		// The next block may begin before this one has fully settled.
		t = at + span + Math.min(dur, OVERLAP_MS);
		return at;
	};

	return {
		/** A word-staggered text block (prompt, premise). */
		text: (/** @type {string} */ s, /** @type {number} */ stagger = WORD_MS) =>
			push(Math.max(0, wordCount(s) - 1) * stagger, FADE_MS),
		/** A drawn horizontal rule. */
		rule: () => push(0, RULE_MS),
		/** Any single element that just fades in (a figure, a panel, a slider). */
		block: (/** @type {number} */ dur = FADE_MS) => push(0, dur),
		/** `n` staggered siblings. */
		items: (/** @type {number} */ n, /** @type {number} */ stagger = ITEM_MS) =>
			push(Math.max(0, n - 1) * stagger, FADE_MS),
		/**
		 * The action row. Starts only once EVERYTHING above has finished — this
		 * is the one method that reads `end` rather than `t`.
		 */
		action: () => {
			const at = Math.max(t, end) + GAP_MS;
			t = at;
			end = at + FADE_MS;
			return at;
		},
		/** When the card is completely assembled. */
		done: () => end
	};
}
