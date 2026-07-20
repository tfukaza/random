<script>
	// detail-claim — a plain self-report on the scope axis, sitting right after
	// honesty-claim so chapter 1 collects two claims in a row before it has
	// tested either. Played completely straight, like every claim question: the
	// flatness is what makes it read as ordinary survey filler.
	//
	// The poles are deliberately both flattering. Neither "meticulous" nor
	// "visionary" is the wrong answer to give, which is what makes people answer
	// honestly — and what makes a later contradiction land (see below).
	import SliderPick from './SliderPick.svelte';
	let { onAnswer } = $props();

	const prompt = 'How would you rate your attention to detail?';

	/** @param {number} value */
	function toScore(value) {
		// Logged because the two illusion questions bill against it: claim the
		// meticulous end here and then miss what they test, and detailClaim.js
		// charges honesty for the contradiction. Same shape as honesty-claim.
		// 1 → scope −3 (detail-oriented), 7 → scope +3 (big-picture). The axis is
		// signed around 4, so the midpoint scores nothing.
		return { scope: value - 4 };
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — I’m extremely meticulous. I notice every detail. Some may say tunnel-visioned."
	rightLabel="7 — I only look at the picture and weave a vision. I might miss some details, but that’s okay."
	{toScore}
	{onAnswer}
/>
