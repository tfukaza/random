// Written by Q40Memory (`memory-claim`), read by Q39Recall (`recall-trap`) to
// decide which version of the test it runs. Both now sit in chapter 2, first
// and last respectively — the widest separation available inside one chapter.
//
// The direction of this state INVERTED when memory-claim moved ahead of the
// recall. It used to carry a verdict backwards — Q39 graded the recall, Q40
// sharpened its wording if you had failed. Now the claim comes first and the
// test lands at the far end of the chapter, so it carries the boast forwards
// instead. Same shape as honesty-claim → found-wallet.
//
// `claim` is null until memory-claim has actually been answered, which covers
// deep-links into the middle of the quiz — no claim means no boast to punish,
// so recall-trap serves its gentle branch. Same fallback discipline as
// boxState and patienceState.
export const recall = $state({
	/** @type {number | null} Likert index from memory-claim; null = not answered */
	claim: null,
	/**
	 * Which kind of memory the taker named as their strength, from recall-trap's
	 * soft branch. This is the BRANCH KEY for the scene-recall pair: the probe
	 * they get tests precisely the faculty they nominated.
	 *
	 * Null in two legitimate cases, and both must stay harmless — a deep-link
	 * past recall-trap, and anyone on the HARD branch, who was asked for exact
	 * wording instead and so never named a type at all. The latter is not an
	 * error: claiming a good memory in the strongest terms is itself the answer,
	 * and the scene probes them on something nobody attends to.
	 *
	 * 'none' is the "I'm bad at all of them" answer — not a faculty, so it is not
	 * in MEMORY_TYPES; the scene routes it to the easy tier.
	 * @type {typeof MEMORY_TYPES[number]['id'] | 'none' | null}
	 */
	type: null
});

// The taxonomy is real, which is what lets the question read as sincere rather
// than as setup. Ordered as presented. Exported so recall-trap's options and the
// scene probes are generated from ONE list — a probe keyed to a type that is not
// offered, or an option with no probe behind it, is the failure mode here and
// neither can happen if both read this.
//
// Procedural memory was deliberately dropped: knowing HOW to do things is not
// something a scene can test without collapsing into episodic, and every option
// on offer has to lead somewhere real.
export const MEMORY_TYPES = /** @type {const} */ ([
	{ id: 'episodic', label: 'Episodic — things that happened to you' },
	{ id: 'semantic', label: 'Semantic — facts, names, general knowledge' },
	{ id: 'working', label: 'Working — holding something in mind right now' },
	{ id: 'prospective', label: 'Prospective — remembering to do a thing later' },
	{ id: 'spatial', label: 'Spatial — routes, layouts, where you put things' }
]);

// Index into memory-claim's Likert row. Only this answer arms the hard branch:
// "Agree" is an opinion, "Strongly agree" is a claim, and the quiz only tests
// claims — the same endpoint rule patienceMode() and math-test now follow.
export const STRONGLY_AGREE = 4;

// Dev-only console handle, same convention as stashState's `__stash`. The hard
// branch is otherwise reachable only by answering memory-claim and then playing
// nine questions, which makes it tedious to inspect and easy to leave untested.
//   __recall.recall.claim = __recall.STRONGLY_AGREE   → arm the hard branch
//   __recall.recall.claim = null                      → back to the soft one
//   __recall.recall.type = 'spatial'                  → pick the scene probe
// Both are read at mount, so set them before the question renders.
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__recall = { recall, STRONGLY_AGREE, MEMORY_TYPES };
}
