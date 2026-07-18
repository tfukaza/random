<script>
	// Q5 — the escalating-range gag. Reasonable → reasonable → nine figures.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'What is your ideal income?';
	const options = [
		{ label: '20k to 50k', score: { adventurer: 3 } },
		{ label: '50k to 100k', score: { sage: 3 } },
		{ label: '100k to 200k', score: { maker: 3 } },
		{ label: '200k to 600k', score: { connector: 3 } },
		{ label: '600k to 2 million', score: { adventurer: 3 } },
		{ label: '2 million to 10 million', score: { sage: 3 } },
		{ label: '100 million', score: { maker: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
