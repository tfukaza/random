<script>
	// Q45 — absurd premise delivered completely straight. The catastrophe is
	// stated as settled fact and never remarked on; the question it leads to is
	// a mundane logistics problem about groceries. That gap is the joke, so
	// resist any urge to have the question acknowledge how bad this is.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		'Global warming has flooded your apartment building from the basement up to the fiftieth floor. You live on the fifty-first. The nearest grocery store is now across open water.';
	const prompt = 'How do you make the trip — and get the groceries back?';
	const options = [
		// Swimming a grocery run is the literal one-person army; a paddle boat
		// is a two-seater, which quietly implies a partner.
		{ label: 'Swim', score: { risk: 3, tempo: 1, coord: -2 } },
		{ label: 'Kayak', score: { creative: 1, coord: -1 } },
		{ label: 'Paddle boat', score: { risk: -2, tempo: -2, coord: 1 } },
		{ label: 'Jet ski', score: { risk: 2, social: 1, tempo: 2 } }
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
