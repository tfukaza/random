<script>
	// Q4 — situational reset before the absurdity ramps up.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'If you had a really rough day, how do you wind down and recollect yourself?';
	const options = [
		{ label: 'Party hard', score: { connector: 3 } },
		{ label: 'Listen to music alone', score: { sage: 3 } },
		{ label: 'Write a personal diary', score: { maker: 3 } },
		{ label: 'Go for a long walk or run to clear your head', score: { adventurer: 3 } },
		{ label: 'Call a close friend and vent it all out', score: { connector: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
