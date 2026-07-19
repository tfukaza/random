<script>
	// Q41 — the first of the "absurd reprise" questions: an earlier question
	// asked a second time, with the wording subtly degraded. These sit between
	// the heavier interactive formats as breathers, and the joke works because
	// the taker half-recognizes the question without being able to place what
	// changed.
	//
	// This one reprises Q1Party. The prompt is verbatim; the options are the
	// same four, but every location has slid one position down the list:
	//
	//   Q1                                    Q41
	//   The center of the CONVERSATION   →    The center of the KITCHEN
	//   One-on-one in the KITCHEN        →    One-on-one in the CORNER
	//   Petting the dog in a CORNER      →    Petting the dogs AT HOME
	//   Already HOME, honestly           →    Talking to yourself
	//
	// DO NOT "fix" these — "The center of the kitchen" is not a typo for "the
	// center of the conversation", it is the entire bit. The dog is plural here
	// on purpose too. Scores are copied from Q1 by position, so structurally
	// this really is the same question, just wrong.
	import PickList from './PickList.svelte';
	import { ledger } from './ledger.svelte.js';
	let { onAnswer } = $props();

	const prompt = "At a party, you're most likely to be…";
	const options = [
		{ label: 'The center of the kitchen', score: { social: 2 } },
		{ label: 'Chatting one-on-one in the corner', score: { social: -1 } },
		{ label: 'Petting the host’s dogs at home', score: { social: -2 } },
		{ label: 'Talking to yourself', score: { social: -2, creative: 1 } }
	];

	// Consistency check vs Q1 (options correspond by position): the same person
	// answering "the same question" twice should land in the same slot. A
	// drifting self-report is scored as such; a deep-link (no Q1 record) skips.
	let pickedIndex = -1;
	/** @param {Record<string, number>} score */
	function judged(score) {
		const original = ledger.answers.q1?.index;
		if (typeof original !== 'number' || pickedIndex < 0) return score;
		return { ...score, honesty: pickedIndex === original ? 1 : -1 };
	}
</script>

<PickList
	{prompt}
	{options}
	onAnswer={(/** @type {Record<string, number>} */ score) => onAnswer(judged(score))}
	onPick={(/** @type {number} */ i) => (pickedIndex = i)}
/>
