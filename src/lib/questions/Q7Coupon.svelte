<script>
	// expired-coupon — the escalation ladder. Each rung ratchets, and the last
	// two carry it clean past the point of sanity over what is, at most, a few
	// dollars off a dinner. Grounded in a specific weekend-dinner scene so the
	// stakes are social — your friend is sitting right there watching you decide
	// whether to involve law enforcement.
	//
	// The two absurd rungs are scored apart on purpose: the police are the
	// impulsive nuclear option, a lawyer is the patient one. Both are a total
	// loss of proportion, which is what `scope` toward detail measures here.
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
		},
		{
			label: 'Call the police',
			score: { risk: 3, tempo: 3, scope: -2, creative: -1, coord: -1 }
		},
		{
			label: 'Say nothing tonight. Lawyer up in the morning',
			score: { risk: 3, tempo: -2, scope: -3, coord: 1, social: -1 }
		}
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
