<script>
	// Q1 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = "At a party, you're most likely to be…";
	const options = [
		{ label: 'The center of the conversation', score: { social: 3 } },
		{ label: 'Chatting one-on-one in the kitchen', score: { social: -1 } },
		{ label: 'Petting the host’s dog in a corner', score: { social: -2 } },
		{ label: 'Already home, honestly', score: { social: -3, honesty: 1 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
