<script>
	// Q2 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'When making a big decision, you tend to…';
	const options = [
		{ label: 'Go with your gut', score: { risk: 2, scope: 1, coord: -1 } },
		{ label: 'Make a pros-and-cons list', score: { scope: -2, risk: -1 } },
		{ label: 'Ask everyone you know', score: { coord: 2, social: 1, risk: -1 } },
		{ label: 'Delay it until it decides itself', score: { risk: -3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
