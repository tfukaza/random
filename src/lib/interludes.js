// Break cards shown between questions. `after` is the id (see
// src/lib/questions/index.js) of the question the interlude follows, so an
// interlude stays glued to its question through any reorder of `flowOrder`;
// `after: null` places it right before the result. Add entries freely.
//
// Interludes divide the quiz into CHAPTERS, and are functional bounds as well
// as breathers: the patience lens runs from patience-claim to the next
// interlude. Mind that when moving them. (The hide-brush paint used to be wiped
// by the next interlude too; it is permanent now and no longer a constraint.)
// Sentinel for an interlude that runs BEFORE the first question rather than
// after some question. `after: null` was already taken (it means "right before
// the result"), so opening cards use this instead.
export const START = 'start';

export const interludes = [
	// Interlude 0 — the only one that speaks before anything has happened, so it
	// drops the "Interlude" label. Its job is to set expectations for chapter 1:
	// the questions are real and they are scored, but they are also a tour of
	// every way this thing will ask for an answer. Saying so up front costs
	// nothing and stops the early novelty reading as randomness.
	{
		after: START,
		eyebrow: 'Before we begin',
		message: 'The first dozen questions are a warm-up.',
		detail:
			'They are real questions and they are scored like every other. They are also there to introduce you to the range of ways this assessment will ask you for an answer, so that later on the form of a question is never the difficult part.'
	},
	// End of chapter 1 — the taker has now met every input type.
	{ after: 'rank-satisfying', message: "We're just getting started." },
	// End of chapter 2. Anchored to recall-trap because that is the LAST question
	// of the chapter — previously artistic-claim, and scam-text before that.
	// Re-anchoring is mandatory every time the chapter's tail changes, not
	// cosmetic: left on a stale id this interlude cuts the chapter in half, which
	// last time would have stranded the four taste questions away from the
	// artistic-claim they restyle, and now would additionally split memory-claim
	// from the recall-trap that bills it.
	{ after: 'recall-trap', message: "Let's move on." },
	// Ends chapter 3, and — load-bearing — bounds the patience-claim patience lens: this is
	// Re-anchored from ideal-residence to coffee-prompt when that question was
	// cut. Whatever the LAST question of chapter 3 is, this must sit after it:
	// the lens runs from patience-claim to the next interlude, so anchoring it to
	// a question in the middle of the chapter would end the slow delivery early.
	// where slow delivery stops; fast delivery pauses for this card, then resumes. The message reads as
	// institutional boilerplate; only takers who just sat through four
	// questions arriving at 1/20th speed get why it's here.
	{ after: 'coffee-prompt', message: 'Thank you for your patience.' },
	// Before the finale gauntlet (P2 — the quiz validates you).
	{ after: 'found-wallet', message: "You're doing better than most." },
	// Pre-result.
	{ after: null, message: 'Take a breath.' }
];
