<script>
	// Q24 — absurdity is climbing: the premise is straight-faced ("where would
	// you live?") but every option is uninhabitable in its own way. The free
	// electricity on option D is the only "perk" offered anywhere.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		'If you could live anywhere, which of these would you choose as your permanent place of residence?';
	const options = [
		{ label: 'A submarine', score: { sage: 3 } },
		{ label: 'A blimp — perpetually flying, never landing', score: { adventurer: 3 } },
		{ label: 'The space station', score: { maker: 3 } },
		{ label: 'Right next to a nuclear power plant — electricity is free', score: { connector: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
