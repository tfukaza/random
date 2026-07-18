<script>
	// Q3 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'How do you recharge after a long day?';
	const options = [
		{ label: 'Time alone', score: { sage: 3 } },
		{ label: 'Time with close friends', score: { connector: 3 } },
		{ label: 'Exercise / going outside', score: { adventurer: 3 } },
		{ label: 'Doomscrolling until 2am', score: { maker: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
