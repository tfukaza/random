<script>
	// Q1 — normal opener.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = "At a party, you're most likely to be…";
	const options = [
		{ label: 'The center of the conversation', score: { connector: 3 } },
		{ label: 'Chatting one-on-one in the kitchen', score: { sage: 3 } },
		{ label: 'Petting the host’s dog in a corner', score: { maker: 3 } },
		{ label: 'Already home, honestly', score: { adventurer: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
