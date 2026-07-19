<script>
	// Q42 — absurd reprise of Q2Decision, same family as Q41PartyAgain. The
	// prompt is verbatim; the options are built from Q2's own verbs and objects
	// recombined across each other, so each answer is assembled from the right
	// parts in the wrong pairs:
	//
	//   Q2                                 Q42
	//   GO WITH your GUT              →    GO WITH your PROS-AND-CONS LIST
	//   MAKE A LIST of pros and cons  →    Let EVERYONE know your PLANS
	//   Ask EVERYONE YOU KNOW         →    MAKE A LIST of EVERYONE YOU KNOW
	//   DELAY it until it decides     →    DELAY your GUT
	//
	// Note this is a looser scramble than Q41's strict one-step rotation —
	// parts cross between non-adjacent options, and "your plans" is new. That's
	// fine: the rule is that it sounds almost right, not that it follows a
	// particular permutation (see docs/lore.md).
	//
	// DO NOT "fix" these — "Delay your gut" is the bit, not a mistake. Scores
	// are copied from Q2 by position, so it really is the same question with
	// its parts shuffled.
	import PickList from './PickList.svelte';
	import { ledger } from './ledger.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'When making a big decision, you tend to…';
	const options = [
		{ label: 'Go with your pros-and-cons list', score: { scope: -1 } },
		{ label: 'Let everyone know your plans', score: { social: 1, coord: 1 } },
		{ label: 'Make a list of everyone you know', score: { scope: -2, coord: 1 } },
		{ label: 'Delay your gut', score: { risk: -2 } }
	];

	// Consistency check vs Q2, same pattern as Q41 (see there).
	let pickedIndex = -1;
	/** @param {Record<string, number>} score */
	function judged(score) {
		const original = ledger.answers.q2?.index;
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
