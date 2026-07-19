<script>
	// Q43 — absurd reprise of Q4RoughDay, and the most unhinged of the set so
	// far. The prompt is verbatim; each option keeps its verb but has taken the
	// *next* option's object, with the last one wrapping back to the first:
	//
	//   Q4                                    Q43
	//   PARTY hard                       →    PARTY alone
	//   LISTEN to music ALONE            →    LISTEN to your own DIARY
	//   WRITE a personal DIARY           →    WRITE a short story about a WALK
	//   GO for a long WALK               →    GO on a VENT-OUT session
	//   CALL a close friend and VENT     →    have an INTENSE CONVERSATION
	//
	// The last option breaks the rotation on purpose: "call a close friend hard"
	// was the mechanical result, but it read as broken English rather than as
	// funny, so it lands as an unsettlingly intense version of the original
	// instead. The rotation is a tool, not a rule — if a slot comes out as
	// nonsense rather than as a joke, rewrite that slot.
	//
	// Option 2 gets an extra turn of the screw — the diary is read back by an AI
	// clone of your own voice — because a reprise this late should escalate, not
	// just scramble.
	//
	// DO NOT "fix" the rest. Scores are copied from Q4 by position.
	import PickList from './PickList.svelte';
	import { ledger } from './ledger.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'If you had a really rough day, how do you wind down and recollect yourself?';
	const options = [
		{ label: 'Party alone', score: { creative: 1, social: -1 } },
		{
			label: 'Listen to your own diary — an AI recreation of your voice, reciting it back to you',
			score: { creative: 2, social: -2 }
		},
		{
			label: 'Write a short story about yourself going on a walk',
			score: { creative: 2 }
		},
		{ label: 'Go on a vent-out session', score: { social: 1 } },
		{
			label: 'Have an intense conversation with a close friend',
			score: { social: 2 }
		}
	];

	// Consistency check vs Q4, same pattern as Q41 (see there).
	let pickedIndex = -1;
	/** @param {Record<string, number>} score */
	function judged(score) {
		const original = ledger.answers.q4?.index;
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
