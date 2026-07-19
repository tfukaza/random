<script>
	// Q38 — tame on its face: a small, sincere "what would you grab" question.
	// Its real job is to plant four items in the taker's memory without ever
	// signalling that they should be remembering anything. Q39 then asks them
	// to recall the list.
	//
	// IMPORTANT: Q39Recall must stay immediately after this question in
	// index.js, and its decoy list must stay in sync with these four options.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		"You're heading out to a picnic and realize, too late, that you forgot to pack any food at all. You open the fridge on your way out the door.";
	const prompt = 'Which one do you grab?';
	const options = [
		{ label: 'An apple', score: { scope: -1 } },
		{ label: 'A banana', score: { creative: -1 } },
		{ label: 'A BLT sandwich', score: { creative: 1, scope: 1 } },
		{ label: 'A protein shake', score: { tempo: 1, risk: 1 } }
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
