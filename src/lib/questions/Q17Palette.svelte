<script>
	// palette-taste — pick a palette purely on aesthetics (no labels). Palettes
	// come from the shared design module so artistic-claim can restyle itself
	// from this answer. The "your quiz" framing is set up by font-taste, which
	// must stay immediately before this.
	import PalettePick from './PalettePick.svelte';
	import { PALETTES } from '$lib/design/palettes.js';
	import { choices } from '$lib/design/choices.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Which color palette would you give it?';

	/** @type {Record<string, Record<string, number>>} */
	const SCORES = {
		neon: { risk: 2, creative: 1 },
		'ugly-pg': { creative: -2, risk: 1 },
		'ugly-mmt': { creative: -2 },
		'pastel-blue': { risk: -1 },
		// Same trade as `lora` in font-taste — see the note there.
		paper: { creative: -2, scope: -1 },
		'mono-orange': { creative: 1, scope: -1 },
		earthy: { creative: 1 }
	};

	// Swatch widths communicate each color's role at a glance: the base
	// background gets the widest band, the accent a medium one, and secondary
	// colors slim stripes.
	const options = PALETTES.map((p) => ({
		id: p.id,
		label: p.label,
		readerLabel: p.label,
		palette: p.colors,
		weights: p.colors.map((c) => (c === p.roles.bg ? 4 : c === p.roles.accent ? 2 : 1)),
		score: SCORES[p.id]
	}));

	/** @param {number} i */
	function record(i) {
		choices.palette = PALETTES[i];
	}
</script>

<PalettePick {prompt} {options} {onAnswer} onPick={record} />
