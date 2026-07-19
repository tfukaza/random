<script>
	// Q39 — the trap Q38 set. Nothing in Q38 hinted that the fridge contents
	// were worth memorizing, so this arrives as an ambush.
	//
	// Each decoy is a deliberate near-miss of a real item rather than a random
	// food, which is what makes it hard: orange and lemon shadow the apple and
	// banana, the sports drink shadows the protein shake, and the meatball
	// sandwich shadows the BLT. Real and decoy are interleaved so position
	// gives nothing away.
	//
	// Scoring is the joke: remembering correctly reads as detail-orientation,
	// while confidently inventing a fridge you never saw reads as gist-thinking
	// and nerve — not as lying. The honesty hit lands in Q40, where they claim
	// to have a good memory anyway.
	//
	// The verdict is also written to recallState for Q40Memory, which sharpens
	// its wording if the taker got this wrong.
	//
	// IMPORTANT: this must stay immediately after Q38Picnic in index.js — the
	// prompt says "the previous question" — and the four `real` labels below
	// must match Q38's options verbatim.
	import MultiPick from './MultiPick.svelte';
	import { recall } from './recallState.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'What were the four options in the previous question? Pick four.';

	// Reals reward detail memory; picking a decoy is inventing a fridge from
	// gist — loose, confident thinking, but not lying (the honesty consequences
	// land in Q40, where they CLAIM to have a good memory).
	const real = (/** @type {string} */ label) => ({
		label,
		score: { scope: -1 },
		real: true
	});
	const decoy = (/** @type {string} */ label) => ({
		label,
		score: { scope: 1, risk: 1 },
		real: false
	});

	const options = [
		decoy('An orange'),
		real('An apple'),
		decoy('A meatball sandwich'),
		real('A protein shake'),
		real('A banana'),
		decoy('A lemon'),
		real('A BLT sandwich'),
		decoy('A bottle of sports drink')
	];

	// Only a clean sweep counts: all four real items, nothing invented.
	/** @param {number[]} picked */
	function judge(picked) {
		const chosen = new Set(picked);
		recall.correct = options.every((o, i) => chosen.has(i) === o.real);
	}
</script>

<MultiPick {prompt} {options} {onAnswer} onPick={judge} />
