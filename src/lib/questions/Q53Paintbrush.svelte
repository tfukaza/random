<script>
	// hide-brush — a small domestic panic, asked straight. Formerly a murder
	// weapon; the mechanic survived the retheme intact because what made it work
	// was never the gore, it was that one option quietly ruins the stationery.
	//
	// THE FIRST OPTION IS THE MECHANIC. This quiz is presented as a stack of
	// paper, so shoving a wet brush under it starts paint spreading out from
	// beneath the stack — see PaintPool.svelte — and, unlike everything else in
	// the quiz, it never goes away.
	//
	// Because it never goes away, it must fire on SUBMIT, not on selection. This
	// used to hang off `onPick`, which fires on every click: selecting the stack,
	// thinking better of it and submitting the bin still left paint creeping out
	// from under the card for the rest of the quiz — a permanent consequence for
	// an answer the taker never gave. `onSubmit` runs synchronously when the
	// button is pressed, ahead of PickList's 520ms advance, so the first seep
	// still appears on the card the taker is looking at.
	//
	// Honesty is deliberately NOT scored here. The premise already establishes
	// that you are concealing this; every option conceals, so it cannot
	// discriminate. What differs is how much of the actual problem each answer
	// solves, which is a scope and tempo question.
	import PickList from './PickList.svelte';
	import { hideBrush } from './stashState.svelte.js';

	let { onAnswer } = $props();

	const premise =
		'You are an artist. Your roommate is not, and ever since you spilled paint on the carpet — the cleaning bill was its own small tragedy — the rule has been no paint in the apartment. You have been painting anyway. Everything is packed away except the brush still in your hand, and you hear the front door.';
	const prompt = 'Where do you put it?';

	const options = [
		{
			label: 'Under this stack of paper on the table',
			score: { tempo: 3, scope: 2, risk: 2 }
		},
		{
			label: 'Straight in the bin. Better than being found out',
			score: { risk: -2, creative: -2, tempo: 2 }
		},
		{
			label: 'Bury it in the pile of laundry right next to you',
			score: { creative: 1, risk: 2, scope: 1 }
		},
		{
			label: 'Frantically wipe the paint off it',
			score: { scope: -3, tempo: -2, risk: -1 }
		}
	];

	const STASH = 0;

	/** @param {number} i */
	function record(i) {
		if (i === STASH) hideBrush();
	}
</script>

<PickList {premise} {prompt} {options} {onAnswer} onSubmit={record} />
