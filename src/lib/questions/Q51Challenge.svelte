<script>
	// Q51 — a sincere 1–7 self-assessment, asked completely straight. Like Q29
	// (patience) and Q48 (honesty), the flatness is the point: it reads as
	// ordinary survey filler.
	//
	// The claim is logged, because Q52 tests it immediately: say you want an easy
	// life and you get arithmetic; say you love a challenge and you get a second
	// derivative. Keep these two adjacent in index.js.
	import SliderPick from './SliderPick.svelte';

	let { onAnswer } = $props();

	const prompt = 'Which would you prefer: an easy life or a hard life?';

	/** @param {number} value */
	function toScore(value) {
		// The claim is cheap; Q52 is where it costs something.
		return { risk: Math.round((value - 4) / 2) };
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — I like it when my life is easy"
	rightLabel="7 — I’m always down to tackle something hard"
	{toScore}
	{onAnswer}
/>
