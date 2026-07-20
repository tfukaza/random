<script>
	// Q9 — a plain one, late in chapter 1.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'If you could only eat one meal a day for the next year, which would you make it?';
	const options = [
		{ label: 'Breakfast', score: { scope: -1, tempo: -1 } },
		{ label: 'Brunch', score: { social: 2 } },
		{ label: 'Lunch', score: { creative: -1 } },
		{ label: 'Linner', score: { creative: 2 } },
		{ label: 'Dinner', score: { social: 1 } },
		{ label: 'Late-night meal', score: { risk: 1, social: -1 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
