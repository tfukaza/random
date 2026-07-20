// Written by Q40Memory (`memory-claim`, chapter 3), read by Q39Recall
// (`recall-trap`, chapter 4) to decide which version of the test it runs.
//
// The direction of this state INVERTED when memory-claim moved ahead of the
// recall. It used to carry a verdict backwards — Q39 graded the recall, Q40
// sharpened its wording if you had failed. Now the claim comes first and the
// test lands a chapter later, so it carries the boast forwards instead. Same
// shape as honesty-claim → found-wallet.
//
// `claim` is null until memory-claim has actually been answered, which covers
// deep-links into the middle of the quiz — no claim means no boast to punish,
// so recall-trap serves its gentle branch. Same fallback discipline as
// boxState and patienceState.
export const recall = $state({
	/** @type {number | null} Likert index from memory-claim; null = not answered */
	claim: null
});

// Index into memory-claim's Likert row. Only this answer arms the hard branch:
// "Agree" is an opinion, "Strongly agree" is a claim, and the quiz only tests
// claims — the same endpoint rule patienceMode() and math-test now follow.
export const STRONGLY_AGREE = 4;
