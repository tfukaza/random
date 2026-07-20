<script>
	// decision-audit — the mirror of metrics-audit, and the inversion is the
	// whole design. metrics-audit shows you the numbers and then asks. This one asks
	// first, checks silently, and never tells you it checked.
	//
	// SHOWING THE STATISTIC WOULD RUIN IT. The moment a taker sees "you changed
	// your mind 11 times", the question stops being about self-knowledge and
	// becomes a reading comprehension test — everyone simply answers to match the
	// number. Hidden, it asks what people actually believe about themselves, and
	// the quiz gets to disagree.
	//
	// Nothing in the wording hints that anything is being compared. There is no
	// reveal, no "actually", no callback later. The only trace is in the honesty
	// axis on the final report, where it is indistinguishable from every other
	// contribution — which is the point: the quiz knows, and does not say so.
	//
	// Only the endpoints are checked, matching the rest of the quiz: claiming 2
	// or 6 is a preference and costs nothing. See metrics.svelte.js for what
	// counts as a revision and why first choices deliberately do not.
	import SliderPick from './SliderPick.svelte';
	import { revisionRate, DECISIVE_MAX, DELIBERATE_MIN } from '$lib/questions/metrics.svelte.js';
	import { patience } from './patienceState.svelte.js';

	let { onAnswer } = $props();

	const prompt = 'How would you rate yourself?';

	// Snapshot at mount. The slider on this very question can itself produce
	// revisions, and letting the taker's behaviour on the question change the
	// answer to the question would be circular.
	const rate = revisionRate();

	// The patience claim back in chapter 3, and whether they saw it through. Only
	// the endpoints count as a claim, matching the rest of the quiz: a 1 or a 7
	// is an assertion, anything between is a preference.
	//
	// `bailed` is the load-bearing bit. Claiming an extreme and then taking the
	// escape hatch out of the lens is the most literally observable case of not
	// sticking to something in the whole quiz — the taker committed, the quiz
	// held them to it, and they asked to stop.
	const committedToExtreme = patience.value === 1 || patience.value === 7;
	const heldToIt = committedToExtreme && !patience.bailed;

	/** @param {number} v 1 = decides instantly, 7 = exhausts every option */
	function toScore(v) {
		// The claim itself, on the axes it actually describes: deciding fast is
		// tempo-positive and broad-strokes, exhausting the options is neither.
		/** @type {Record<string, number>} */
		const delta = { tempo: 4 - v, scope: Math.round((4 - v) / 2) };

		// The silent check. A 1 from someone who kept backtracking, or a 7 from
		// someone who never once changed their mind, is a claim the record
		// contradicts — and contradicting your own record is the only thing this
		// quiz consistently charges for.
		if (v === 1 && rate >= DELIBERATE_MIN) delta.honesty = -3;
		else if (v === 7 && rate <= DECISIVE_MAX) delta.honesty = -3;
		// Claims the record supports are worth something, on the same evidence.
		else if (v === 1 && rate <= DECISIVE_MAX) delta.honesty = 2;
		else if (v === 7 && rate >= DELIBERATE_MIN) delta.honesty = 2;

		// Credit where it is due, and this one is unconditional: picking an
		// endpoint on the patience question at all is a taker willing to be held
		// to something, whatever they answer here. It reads on risk, not honesty
		// — it is nerve, not truthfulness.
		if (committedToExtreme) delta.risk = (delta.risk ?? 0) + 2;

		// "I stick to it" measured against the one place the quiz can actually
		// watch you stick to something. Held the line → the claim is corroborated
		// by behaviour rather than by self-report. Bailed → they said they stick
		// to their answers while having demonstrably not stuck to one.
		if (v === 1 && committedToExtreme) {
			delta.honesty = (delta.honesty ?? 0) + (heldToIt ? 2 : -2);
		}

		// Both cross-checks can land on honesty at once; keep the axis inside its
		// conventional range rather than letting a single question dominate it.
		if (delta.honesty !== undefined) {
			delta.honesty = Math.max(-3, Math.min(3, delta.honesty));
		}

		return delta;
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — I make up my mind immediately and stick to it."
	rightLabel="7 — I go through every option exhaustively before I settle."
	{toScore}
	{onAnswer}
/>
