<script>
	// font-taste — opens the four-question design block. Every option says the
	// same thing; you "reveal your personality" purely by which font you find
	// prettiest. Fonts come from the shared design module so artistic-claim can
	// restyle itself from this answer.
	//
	// THIS QUESTION CARRIES THE PREMISE for all four. The taker is designing a
	// personality quiz of their own — so the sample text is this quiz's actual
	// title, and the payoff four questions later is artistic-claim rendered in
	// whatever they built. The other three just say "your quiz" and rely on this
	// one having set it up; keep them contiguous and keep this one first.
	import PickList from './PickList.svelte';
	import { FONTS } from '$lib/design/fonts.js';
	import { choices } from '$lib/design/choices.svelte.js';
	let { onAnswer } = $props();

	const premise =
		'You are designing a personality quiz of your own, and you would like it to look good.';
	const prompt = 'Which font would you set it in?';
	// Every option carries the SAME text, so the only thing distinguishing them is
	// the typeface. Keep it short and self-evidently filler — anything with real
	// content pulls attention onto what it says instead of how it looks.
	const text = 'This font is the best.';

	/** @type {Record<string, Record<string, number>>} */
	const SCORES = {
		poppins: { creative: -1 },
		playfair: { creative: 1 },
		// Choosing the face already in front of you: either you noticed, or you
		// invented nothing. The quiz cannot tell which, and scores the overlap.
		lora: { creative: -1, scope: -1 },
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

<PickList {premise} {prompt} {options} {onAnswer} onPick={record} />
