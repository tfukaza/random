<script>
	// Q54 — the first question of the delivery-driver arc (docs/lore.md, Arc 3):
	// one obstacle per question, and the obstacle here is a person rather than
	// weather or traffic. Asked straight, scored flippantly.
	//
	// It also does structural work: sitting immediately after Q53, it is the first
	// screen the spreading pool from Q53 actually carries onto.
	import PickList from './PickList.svelte';

	let { onAnswer } = $props();

	const premise =
		'You are delivering food, and you are late — you stopped to hold a door open for someone who was struggling with it. The customer is already agitated when they open the door. You apologise and hand the bag over, and they start berating you: about the time, about the bag, about things that do not follow from each other at all.';
	const prompt = 'What do you do?';

	const options = [
		{ label: 'Throw the food in their face and refuse the delivery', score: { risk: 3, tempo: 3, coord: -3, social: -1 } },
		{ label: 'Take it for now, and quit being a delivery driver right after', score: { risk: -2, tempo: -2, honesty: -1 } },
		{ label: 'Eat the food in front of them', score: { creative: 3, risk: 3, coord: -2, social: 1 } }
	];

</script>

<PickList {premise} {prompt} {options} {onAnswer} />
