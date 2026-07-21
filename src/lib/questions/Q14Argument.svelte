<script>
	// Q14 — same slider input mode as Q13, reinforcing the format before it recurs later.
	import SliderPick from './SliderPick.svelte';
	let { onAnswer } = $props();

	// Asked as a question with two named poles, rather than as a statement you
	// agree with by degrees. The old wording described the high end in detail and
	// left the low end as "not at all me", which quietly made replaying sound
	// like the real answer and forgetting sound like the absence of one. Both
	// ends are now something a person actively does.
	const prompt = 'After a heated argument or debate, how do you reflect on it afterwards?';

	/** @param {number} value */
	function toScore(value) {
		// Replaying arguments move-by-move is detail orientation in its purest form.
		return { scope: Math.max(-3, Math.min(3, 4 - value)) };
	}
</script>

<SliderPick
	{prompt}
	min={0}
	max={7}
	leftLabel="0 — I try to immediately forget about it and move on."
	rightLabel="7 — I simulate in my head over and over how it could have gone differently."
	{toScore}
	{onAnswer}
/>
