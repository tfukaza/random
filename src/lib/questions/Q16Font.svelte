<script>
	// Q16 — every option says the same thing; you "reveal your personality" purely
	// by which font you find prettiest. Fonts come from the shared design module so
	// Q19 can restyle itself from this answer.
	import PickList from './PickList.svelte';
	import { FONTS } from '$lib/design/fonts.js';
	import { choices } from '$lib/design/choices.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Which font looks the best to you?';
	const text = 'This font looks the best';

	/** @type {Record<string, Record<string, number>>} */
	const SCORES = {
		poppins: { creative: -1 },
		playfair: { creative: 1 },
		comic: { risk: 2, creative: -2 },
		bitcount: { creative: 2 },
		plexmono: { scope: -2 }
	};

	const options = FONTS.map((f) => ({ label: text, font: f.css, score: SCORES[f.id] }));

	/** @param {number} i */
	function record(i) {
		choices.font = FONTS[i];
	}
</script>

<PickList {prompt} {options} {onAnswer} onPick={record} />
