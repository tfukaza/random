<script>
	// Q14 — same slider input mode as Q13, reinforcing the format before it recurs later.
	import SliderPick from './SliderPick.svelte';
	let { onAnswer } = $props();

	const prompt =
		'After a heated argument or debate, you reflect on it afterward — replaying it in your head and simulating how else it could have gone, to argue better in your favor.';

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
	leftLabel="0 — not at all me"
	rightLabel="7 — very much me"
	{toScore}
	{onAnswer}
/>
