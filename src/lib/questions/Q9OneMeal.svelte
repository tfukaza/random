<script>
	// Q9 — still in the "normal" band, closing it out.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'If you could only eat one meal a day for the next year, which would you make it?';
	const options = [
		{ label: 'Breakfast', score: { sage: 3 } },
		{ label: 'Brunch', score: { connector: 3 } },
		{ label: 'Lunch', score: { maker: 3 } },
		{ label: 'Linner', score: { maker: 3 } },
		{ label: 'Dinner', score: { connector: 3 } },
		{ label: 'Late-night meal', score: { adventurer: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
