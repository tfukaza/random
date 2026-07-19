<script>
	// Q6 — Friday-night dinner budget. Options are a DRAFT pending confirmation.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		"It's Friday night — nothing special, you just want to eat something delicious. What's your budget?";
	const options = [
		{ label: 'Under $15 (fast food energy)', score: { creative: -1, risk: -1 } },
		{ label: '$15–30', score: { risk: -1 } },
		{ label: '$30–60', score: {} },
		{ label: '$60–120', score: { risk: 1 } },
		{ label: '$120–300', score: { risk: 2 } },
		{ label: '$300–800', score: { risk: 2, creative: 1 } },
		{ label: '$2,000', score: { risk: 3, scope: 1 } },
		{
			label: 'Money is not a concept that applies to dinner',
			score: { creative: 3, scope: 2 }
		}
	];
</script>

<PickList {prompt} {options} {onAnswer} />
