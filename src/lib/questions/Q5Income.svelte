<script>
	// Q5 — the escalating-range gag. Reasonable → reasonable → nine figures.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'What is your ideal income?';
	const options = [
		{ label: '20k to 50k', score: { risk: -2 } },
		{ label: '50k to 100k', score: { risk: -1 } },
		{ label: '100k to 200k', score: { scope: -1 } },
		{ label: '200k to 600k', score: { risk: 1 } },
		{ label: '600k to 2 million', score: { risk: 2, scope: 1 } },
		{ label: '2 million to 10 million', score: { risk: 2, scope: 2 } },
		{ label: '100 million', score: { risk: 3, scope: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
