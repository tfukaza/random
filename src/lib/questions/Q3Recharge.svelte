<script>
	// Q3 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'How do you recharge after a long day?';
	const options = [
		{ label: 'Time alone', score: { social: -3 } },
		{ label: 'Time with close friends', score: { social: 3 } },
		{ label: 'Exercise / going outside', score: { risk: 1, tempo: 1 } },
		// the honesty point is for the candor of admitting it
		{ label: 'Doomscrolling until 2am', score: { honesty: 1, tempo: -1, risk: -1 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
