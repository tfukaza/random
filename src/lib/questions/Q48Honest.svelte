<script>
	// Q48 — a plain 1–7 self-assessment, played completely straight. Like Q29
	// (patience), the flatness is the point: it reads as ordinary survey filler
	// — and the claim is logged, because Q49 (the wallet) tests it immediately.
	import SliderPick from './SliderPick.svelte';
	import { logAnswer } from './ledger.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'Do you consider yourself to be an honest person?';

	/** @param {number} value */
	function toScore(value) {
		logAnswer('q48', { value });
		// Self-report gets small honesty weight (±2); the evidence-based checks
		// elsewhere move the axis harder than any claim can.
		return { honesty: Math.round((value - 4) / 2) };
	}
</script>

<SliderPick
	{prompt}
	min={1}
	max={7}
	leftLabel="1 — Not especially"
	rightLabel="7 — Completely honest"
	{toScore}
	{onAnswer}
/>
