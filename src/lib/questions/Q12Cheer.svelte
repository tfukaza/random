<script>
	// Q12 — first non-single-pick input mode: multi-select via chips + submit.
	import MultiPick from './MultiPick.svelte';
	let { onAnswer } = $props();

	const prompt =
		"Your friend just lost the cat he'd had since he was a kid, and it broke his heart. How do you comfort him? Pick any number of them.";
	const options = [
		{ label: 'Call him', score: { connector: 3 } },
		{ label: 'Take him out for lunch', score: { connector: 2 } },
		{
			label: 'Take him out for a quick day out — not a vacation, just something to take his mind off things',
			score: { adventurer: 3 }
		},
		{
			label: 'Send him some articles or books on grief to help him get through it',
			score: { sage: 3 }
		},
		{ label: 'Recommend getting therapy', score: { sage: 2 } }
	];
</script>

<MultiPick {prompt} {options} {onAnswer} />
