<script>
	// childhood-street — the second of the three. Still phrased like small talk,
	// and by now it is not: this is a real security question, and the previous
	// one established a rhythm of answering. Scored harder than the food because
	// handing it over is a genuinely different act.
	//
	// Nothing typed here is recorded; see TextAsk.svelte.
	import TextAsk from './TextAsk.svelte';
	let { onAnswer } = $props();
</script>

<TextAsk
	prompt="What is the name of the street you grew up on?"
	placeholder="—"
	provided={{ risk: 2, social: 1, scope: 1 }}
	withheld={{ risk: -1, scope: -2 }}
	{onAnswer}
/>
