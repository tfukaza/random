<script>
	// Q17 — pick a color palette purely on aesthetics (no labels). Palettes come
	// from the shared design module so Q19 can restyle itself from this answer.
	import PalettePick from './PalettePick.svelte';
	import { PALETTES } from '$lib/design/palettes.js';
	import { choices } from '$lib/design/choices.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Which color palette do you find most aesthetically pleasing?';

	/** @type {Record<string, Record<string, number>>} */
	const SCORES = {
		neon: { adventurer: 3 },
		'ugly-pg': { maker: 3 },
		'ugly-mmt': { maker: 2 },
		'pastel-blue': { connector: 3 },
		'mono-orange': { connector: 2 },
		earthy: { sage: 3 }
	};

	// Swatch widths communicate each color's role at a glance: the base
	// background gets the widest band, the accent a medium one, and secondary
	// colors slim stripes.
	const options = PALETTES.map((p) => ({
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
