<script>
	// Q7 — the escalation ladder. Each step ratchets; D is the punchline.
	// Grounded in a specific weekend-dinner scene so the stakes are social
	// (your friend is watching) rather than purely transactional.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		"It's the weekend and you've gone out to dinner with a friend. The bill comes, and you pull out the coupon you'd been saving for this — which, you now notice, expired yesterday.";
	const prompt = 'What do you do?';
	const options = [
		{
			label: 'Say nothing, put it away, and pay full price',
			score: { risk: -2, social: -1 }
		},
		{
			label: 'Politely ask the server if they can still make it work',
			score: { social: 1, coord: 1 }
		},
		{ label: 'Ask for the manager', score: { risk: 1, tempo: 1, coord: 1 } },
		{
			label: 'Argue it on principle until somebody gives in',
			score: { risk: 3, tempo: 1, coord: -1 }
		}
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
