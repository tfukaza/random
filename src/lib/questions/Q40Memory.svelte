<script>
	// Q40 — insult to injury. A perfectly ordinary self-assessment question,
	// except it knows how you just did on Q39.
	//
	// Get the recall question wrong and a single word appears — "actually" —
	// which turns a neutral survey item into the quiz raising an eyebrow at
	// you. Get it right (or arrive here via deep-link, where recall.correct is
	// still null) and the question stays perfectly straight-faced, so the dig
	// only ever lands on people who earned it.
	//
	// IMPORTANT: keep this immediately after Q39Recall — the barb only reads if
	// the failure is still fresh.
	import PickList from './PickList.svelte';
	import { recall } from './recallState.svelte.js';
	let { onAnswer } = $props();

	const prompt = $derived(
		recall.correct === false
			? 'Do you actually consider yourself to have a good memory?'
			: 'Do you consider yourself to have a good memory?'
	);

	const options = [
		{ label: 'Strongly agree', score: { scope: -1, risk: 1 } },
		{ label: 'Agree', score: { scope: -1 } },
		// Neutral and Disagree carry no base delta on purpose — the honesty
		// cross-check in judged() below is the whole scoring for those answers.
		{ label: 'Neutral', score: {} },
		{ label: 'Disagree', score: {} },
		{ label: 'Strongly disagree', score: { risk: -1 } }
	];

	// The honesty verdict: the taker just watched themselves pass or fail Q39,
	// and this is what they claim anyway. Owning a failure is worth more than
	// being right and saying so; null (deep-link) stays neutral. PickList hands
	// the pick index to onPick before onAnswer fires, so capture it there.
	let pickedIndex = -1;
	/** @param {Record<string, number>} score */
	function judged(score) {
		const delta = { ...score };
		const i = pickedIndex;
		if (recall.correct === false && i >= 0 && i <= 1) delta.honesty = -3;
		else if (recall.correct === true && i >= 0 && i <= 1) delta.honesty = 2;
		else if (recall.correct === false && i >= 3) delta.honesty = 3;
		return delta;
	}
</script>

<PickList
	{prompt}
	{options}
	onAnswer={(/** @type {Record<string, number>} */ score) => onAnswer(judged(score))}
	onPick={(/** @type {number} */ i) => (pickedIndex = i)}
/>
