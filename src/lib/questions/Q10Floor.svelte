<script>
	// Q10 — closes out the "normal" band (1–10). Ramp begins at Q11.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		'You just moved into a new 100-story apartment building. Rent, floor space, floor plan — everything is exactly the same on every floor. Which floor would you live on?';
	const options = [
		{ label: 'Basement', score: { maker: 3 } },
		{ label: 'Floor 1', score: { connector: 3 } },
		{ label: 'Floor 10', score: { sage: 3 } },
		{ label: 'Floor 50', score: { adventurer: 3 } },
		{ label: 'The top — floor 100', score: { adventurer: 3 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
