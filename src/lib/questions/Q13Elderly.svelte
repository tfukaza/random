<script>
	// Q13 — second input mode: a slider. Also opens the delivery-driver arc
	// (see docs/lore.md, arc 3): the obsession vs. basic decency, with the
	// food getting colder the whole time.
	import SliderPick from './SliderPick.svelte';
	let { onAnswer } = $props();

	const premise =
		'You drive deliveries. You have one order in the passenger seat, it is still hot, and you have never once been late.';
	const prompt =
		'Half a block from the drop-off, an elderly man is struggling with a heavy door, both arms full. Nobody else is around. How likely are you to stop and help him?';

	/** @param {number} value */
	function toScore(value) {
		return { connector: value };
	}
</script>

<SliderPick
	{premise}
	{prompt}
	min={0}
	max={7}
	leftLabel="0 — the order comes first"
	rightLabel="7 — absolutely, no hesitation"
	{toScore}
	{onAnswer}
/>
