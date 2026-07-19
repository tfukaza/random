<script>
	// Q10 — closes out the "normal" band (1–10). Ramp begins at Q11.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt =
		'You just moved into a new 100-story apartment building. Rent, floor space, floor plan — everything is exactly the same on every floor. Which floor would you live on?';
	const options = [
		{ label: 'Basement', score: { social: -2, creative: 1 } },
		{ label: 'Floor 1', score: { creative: -2, tempo: 1 } },
		{ label: 'Floor 10', score: { risk: -1 } },
		{ label: 'Floor 50', score: {} },
		{ label: 'The top — floor 100', score: { risk: 3, scope: 2 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} />
