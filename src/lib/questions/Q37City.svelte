<script>
	// Q37 — deliberate filler. A plain, sincere preference question with no
	// trick, no lore and no gimmick, sitting between the louder formats around
	// it so the quiz has somewhere to breathe.
	//
	// Options are ordered as a straight density gradient, emptiest to densest,
	// so the scale reads at a glance rather than as five unrelated choices.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'What kind of place would you ideally want to live in?';
	const options = [
		{ label: 'A cabin in the middle of nowhere', score: { social: -3, risk: 1 } },
		{ label: 'A small rural town', score: { social: -1 } },
		{ label: 'Quaint suburbs', score: { social: 1, risk: -1, creative: -1 } },
		{ label: 'A modestly busy city — a million people or so', score: { social: 1 } },
		{ label: 'A bustling metropolis', score: { social: 3, risk: 1, tempo: 1 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
