<script>
	// Q29 — a completely sincere 1–7 self-assessment. Plays straight on purpose:
	// it reads as ordinary survey filler.
	//
	// THE PAYOFF: the rating is stashed in `patienceState` and then governs how
	// every question after this one is *delivered*, until the next interlude —
	// so the patience claimed here is immediately measured against how the taker
	// actually behaves. See docs/lore.md → "Answer-driven presentation".
	import SliderPick from './SliderPick.svelte';
	import { patience } from './patienceState.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'How patient are you?';

	/** @param {number} value */
	function toScore(value) {
		// Called exactly once, on commit — the hook where we record the raw answer
		// for the following questions to read. Clearing `bailed` matters on a
		// replay: a previous run's escape hatch shouldn't silently disable the bit.
		patience.value = value;
		patience.bailed = false;
		// tempo: claiming impatience = quick-action, patience = long-and-steady.
		// The claim itself is cheap — the big honesty/tempo points land at the end
		// of the lens band, where the claim gets tested (+page.svelte).
		return { tempo: Math.max(-3, Math.min(3, 4 - value)) };
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — Impatient; I prefer when everything is lightning fast"
	rightLabel="7 — Very patient; I don’t mind waiting"
	{toScore}
	{onAnswer}
/>
