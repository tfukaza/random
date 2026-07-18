<script>
	// Q6 — Friday-night dinner budget. Options are a DRAFT pending confirmation.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		"It's Friday night — nothing special, you just want to eat something delicious. What's your budget?";
	const options = [
		{ label: 'Under $15 (fast food energy)', score: { adventurer: 3 } },
		{ label: '$15–30', score: { sage: 3 } },
		{ label: '$30–60', score: { maker: 3 } },
		{ label: '$60–120', score: { connector: 3 } },
		{ label: '$120–300', score: { adventurer: 3 } },
		{ label: '$300–800', score: { sage: 3 } },
		{ label: '$2,000', score: { maker: 3 } },
		{ label: 'Money is not a concept that applies to dinner', score: { connector: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
