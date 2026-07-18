<script>
	// Q2 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'When making a big decision, you tend to…';
	const options = [
		{ label: 'Go with your gut', score: { adventurer: 3 } },
		{ label: 'Make a pros-and-cons list', score: { sage: 3 } },
		{ label: 'Ask everyone you know', score: { connector: 3 } },
		{ label: 'Delay it until it decides itself', score: { maker: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
