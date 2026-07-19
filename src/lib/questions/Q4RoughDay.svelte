<script>
	// Q4 — situational reset before the absurdity ramps up. Logs its pick
	// index: Q43's reprise scores consistency against it (by position).
	import PickList from './PickList.svelte';
	import { logAnswer } from './ledger.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'If you had a really rough day, how do you wind down and recollect yourself?';
	const options = [
		{ label: 'Party hard', score: { social: 3, risk: 1 } },
		{ label: 'Listen to music alone', score: { social: -2 } },
		{ label: 'Write a personal diary', score: { creative: 2, social: -1 } },
		{
			label: 'Go for a long walk or run to clear your head',
			score: { tempo: -1, social: -1 }
		},
		{ label: 'Call a close friend and vent it all out', score: { social: 2 } }
	];
</script>

<PickList {prompt} {options} {onAnswer} onPick={(/** @type {number} */ i) => logAnswer('q4', { index: i })} />
