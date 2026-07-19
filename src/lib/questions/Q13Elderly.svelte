<script>
	// Q13 — second input mode: a slider. Also opens the delivery-driver arc
	// (see docs/lore.md, arc 3): the obsession vs. basic decency, with the
	// food getting colder the whole time.
	//
	// The bike and the arm's-length distance are load-bearing: they strip away
	// every excuse, so a low answer can only mean the order genuinely comes
	// first. Don't rewrite this to put him across the street or the driver in a
	// car — the whole question is that stopping would cost almost nothing.
	// The bike also fixes the arc's vehicle for every later obstacle.
	import SliderPick from './SliderPick.svelte';
	let { onAnswer } = $props();

	// All the scene-setting lives in the premise (small, muted); the prompt is
	// only the question itself, so the one thing set large is the one thing being
	// asked.
	const premise =
		'You deliver food by bike. Tonight’s order is in the bag on your back, still hot, and you have never once been late. A block from the drop-off, you coast past a shopfront where an elderly man is wrestling with a heavy door, both arms full. He is an arm’s length away, and nobody else is around.';
	const prompt = 'How likely are you to stop and help him?';

	/** @param {number} value */
	function toScore(value) {
		/** @type {Record<string, number>} */
		const delta = { social: Math.max(-3, Math.min(3, value - 4)) };
		// Refusing outright for the sake of a delivery streak is the
		// order-obsessed detail mind at work.
		if (value <= 1) delta.scope = -2;
		return delta;
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
