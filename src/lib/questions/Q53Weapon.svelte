<script>
	// Q53 — a hardball asked like it's nothing (P5): no premise softening, no
	// wink, and the same flippant scoring as a question about fonts.
	//
	// The fourth option is the mechanic. This quiz is presented as a stack of
	// paper, so stashing the weapon under it starts a pool spreading out from
	// beneath the stack — see BloodPool.svelte. `onPick` fires synchronously on
	// click, before PickList's 520ms advance, so it starts on the card the taker
	// is still looking at.
	import PickList from './PickList.svelte';
	import { logAnswer } from './ledger.svelte.js';
	import { hideWeapon } from './stashState.svelte.js';

	let { onAnswer } = $props();

	const premise =
		'You have already dealt with the body. You are home, you are calm, and then you look down and realise the weapon is still in your hand, still wet. Someone knocks — it’s your friend, early. You have a few seconds.';
	const prompt = 'Where do you put it?';

	const options = [
		{ label: 'Under the couch', score: { risk: 3, scope: -2, creative: -2 } },
		{ label: 'Inside the cherry cake in the fridge', score: { creative: 3, risk: 2, social: -1 } },
		{ label: 'In the load of laundry you already have going', score: { scope: 2 } },
		{
			label: 'Under this stack of paper on the table',
			score: { creative: 2, honesty: -2, risk: -1 }
		}
	];

	const STASH = options.length - 1;

	/** @param {number} i */
	function record(i) {
		logAnswer('q53', { index: i });
		if (i === STASH) hideWeapon();
	}
</script>

<PickList {premise} {prompt} {options} {onAnswer} onPick={record} />
