<script>
	// memory-claim — the ordinary half of a two-question setup. A five-point
	// agree/disagree, the most recognizable input in the genre, asked completely
	// straight, and then immediately followed by terms-consent: 1,000 words with
	// a request for a dollar buried in the middle of them. Claim a good memory,
	// then be handed something to remember.
	//
	// Both questions render the SAME LikertPick row, which is the point — the
	// second has to arrive as the same ordinary survey item as the first, so the
	// only thing that has changed is the amount of text above it.
	//
	// The flatness is ON PURPOSE. The other Likert in the quiz (artistic-claim)
	// is a trap, which would make the format itself a tell if the taker never met
	// an innocent one — so this one has to read as filler.
	//
	// It also plants the boast. `recall.claim` carries the answer forward to
	// recall-trap in chapter 4, which tests it — and only tests it hard if the
	// answer was "Strongly agree". Scoring here is deliberately thin: claiming a
	// good memory costs nothing at the time, exactly like honesty-claim. The bill
	// arrives much later, or not at all.
	//
	// This question used to sit AFTER the recall test and sharpen its wording
	// ("do you *actually*…") based on how you'd just done. That barb died when it
	// moved ahead; the arc is now claim-then-test rather than test-then-taunt.
	import LikertPick from './LikertPick.svelte';
	import { recall } from './recallState.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Do you consider yourself to have a good memory?';

	// Indexed by LikertPick's weak → strong order, so index 4 is the boast.
	// recall-trap keys off that index — keep the two in step.
	/** @type {Record<string, number>[]} */
	const SCORES = [
		{ risk: -1 },
		{},
		{},
		{ scope: -1 },
		{ scope: -1, risk: 1 }
	];

	/** @param {number} i */
	function record(i) {
		recall.claim = i;
	}
</script>

<LikertPick {prompt} toScore={(/** @type {number} */ i) => SCORES[i]} {onAnswer} onPick={record} />
