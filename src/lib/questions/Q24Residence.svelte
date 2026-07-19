<script>
	// Q24 — absurdity is climbing: the premise is straight-faced ("where would
	// you live?") but every option is uninhabitable in its own way. The free
	// electricity on option D is the only "perk" offered anywhere.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		'If you could live anywhere, which of these would you choose as your permanent place of residence?';
	const options = [
		{ label: 'A submarine', score: { social: -3, scope: -1 } },
		{
			label: 'A blimp — perpetually flying, never landing',
			score: { risk: 2, creative: 2 }
		},
		{ label: 'The space station', score: { scope: 2, risk: 1 } },
		{
			label: 'Right next to a nuclear power plant — electricity is free',
			score: { creative: -2, risk: 1 }
		}
	];
</script>

<PickList {prompt} {options} {onAnswer} />
