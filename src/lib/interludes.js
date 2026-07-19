// Break cards shown between questions. `after` is the id (see
// src/lib/questions/index.js) of the question the interlude follows, so an
// interlude stays glued to its question through any reorder of `flowOrder`;
// `after: null` places it right before the result. Add entries freely.
//
// Interludes are also functional bounds, not just breathers: the patience
// lens runs from q29 to the next interlude, and the Q53 blood seep is wiped
// by the next interlude reached. Mind those two when moving them.
export const interludes = [
	// End of the normal band (band A).
	{ after: 'q12', message: "We're just getting started." },
	// End of the mild-widgets band (band B), right after the design payoff run.
	{ after: 'q21', message: "Let's move on." },
	// Ends band C, and — load-bearing — bounds the q29 patience lens: this is
	// where the slowed-down (or blurred) delivery stops. The message reads as
	// institutional boilerplate; only takers who just sat through four
	// questions arriving at 1/20th speed get why it's here.
	{ after: 'q24', message: 'Thank you for your patience.' },
	// Before the finale gauntlet (P2 — the quiz validates you).
	{ after: 'q49', message: "You're doing better than most." },
	// Pre-result. Wipes the q53 seep.
	{ after: null, message: 'Take a breath.' }
];
