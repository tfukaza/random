<script>
	// Q12 — first non-single-pick input mode: multi-select via chips + submit.
	import MultiPick from './MultiPick.svelte';
	let { onAnswer } = $props();

	const prompt =
		"Your friend just lost the cat he'd had since he was a kid, and it broke his heart. How do you comfort him? Pick any number of them.";
	const options = [
		{ label: 'Call him', score: { social: 2, coord: 1 } },
		{ label: 'Take him out for lunch', score: { social: 2, coord: 1 } },
		{
			label: 'Take him out for a quick day out — not a vacation, just something to take his mind off things',
			score: { social: 1, risk: 1 }
		},
		{
			label: 'Send him some articles or books on grief to help him get through it',
			score: { social: -1, scope: -1, coord: -1 }
		},
		// outsourcing to a professional is still coordination — pragmatic, arms-length kindness
		{ label: 'Recommend getting therapy', score: { creative: -2, social: -1, coord: 1 } }
	];
</script>

<MultiPick {prompt} {options} {onAnswer} />
