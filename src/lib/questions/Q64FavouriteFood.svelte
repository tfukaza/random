<script>
	// favourite-food — opens the chapter-4 security-question run.
	//
	// THE RUN IS THE JOKE, not any single question. Favourite food, the street
	// you grew up on, your mother's maiden name: that is not a random set of
	// personal details, it is the standard bank password-recovery set, asked one
	// at a time by something that has spent forty questions establishing itself
	// as an instrument. Nothing ever acknowledges it. Keep the three ADJACENT and
	// in this order — the escalation only reads if they arrive in a row, and this
	// one has to come first because it is the harmless one.
	//
	// Nothing typed here is recorded; see TextAsk.svelte.
	import TextAsk from './TextAsk.svelte';
	let { onAnswer } = $props();
</script>

<TextAsk
	prompt="Type in your favourite food."
	placeholder="—"
	provided={{ social: 1, creative: 1 }}
	withheld={{ social: -1, risk: -1 }}
	{onAnswer}
/>
