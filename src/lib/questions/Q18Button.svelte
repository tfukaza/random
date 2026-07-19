<script>
	// Q18 — "which button looks nicest?" The options are the buttons themselves.
	// Variants come from the shared design module so Q19 can restyle from this answer.
	import ButtonPick from './ButtonPick.svelte';
	import { BUTTON_VARIANTS } from '$lib/design/buttons.js';
	import { choices } from '$lib/design/choices.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Which button looks the nicest to you?';

	/** @type {Record<string, Record<string, number>>} */
	const SCORES = {
		simple: { creative: -1, scope: -1 },
		shadow: {},
		bold: { risk: 1 },
		bubbly: { creative: 2 }
	};

	const options = BUTTON_VARIANTS.map((v) => ({
		label: v.label,
		variant: v.id,
		score: SCORES[v.id]
	}));

	/** @param {number} i */
	function record(i) {
		choices.button = BUTTON_VARIANTS[i].id;
	}
</script>

<ButtonPick {prompt} {options} {onAnswer} onPick={record} />
