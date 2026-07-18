<script>
	// Q29 — a completely sincere 1–7 self-assessment. Plays straight on purpose:
	// it reads as ordinary survey filler.
	//
	// SETUP FOR A LATER PAYOFF: the rating is stashed in `patienceState` for a
	// future time-based question that actually makes the taker wait — so the
	// claim made here can be measured against how they really behave. Nothing
	// consumes it yet; see docs/lore.md → "Pending dependencies".
	import SliderPick from './SliderPick.svelte';
	import { patience } from './patienceState.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'How patient are you?';

	/** @param {number} value */
	function toScore(value) {
		// Called exactly once, on commit — the hook where we record the raw answer
		// for the future question to read.
		patience.value = value;
		return { sage: value };
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — Impatient; I hate when things take too long"
	rightLabel="7 — Very patient; I don’t mind waiting"
	{toScore}
	{onAnswer}
/>
