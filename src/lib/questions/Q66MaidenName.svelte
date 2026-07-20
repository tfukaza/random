<script>
	// mothers-maiden-name — the punchline, and the only one that looks back.
	//
	// By this point the quiz has asked for a date of birth, a favourite food and
	// a childhood street. This is the fourth item of a set that unlocks bank
	// accounts, and it is still asked in the same flat voice as "which font looks
	// best". The quiz never says so.
	//
	// THE CROSS-CHECK reads only whether the earlier ones were answered — the
	// metrics store holds 'provided' or 'withheld' and never the values
	// themselves, so this can count how open somebody has been without anything
	// having been kept. Handing over the whole set without pausing is the most
	// trusting thing a taker can do in this quiz, and it is scored as such rather
	// than punished: it is nerve and openness, not dishonesty.
	//
	// Nothing typed here is recorded; see TextAsk.svelte.
	import TextAsk from './TextAsk.svelte';
	import { latestResponse } from './metrics.svelte.js';

	let { onAnswer } = $props();

	// Snapshot at mount. 'provided' | 'withheld' | undefined (deep-linked past).
	const earlier = ['birth-date', 'favourite-food', 'childhood-street'];
	const givenSoFar = earlier.filter((id) => latestResponse(id)?.value === 'provided').length;

	// Every previous one handed over, and now this. Nothing guarded at all.
	const fullSet = givenSoFar === earlier.length;

	const provided = fullSet
		? { risk: 3, social: 2, scope: 2 }
		: { risk: 2, social: 1, scope: 1 };
	// Refusing here after answering everything else is the taker noticing, which
	// is worth more than having been careful the whole way through.
	const withheld = givenSoFar >= 2 ? { scope: -3, risk: -1 } : { scope: -2, risk: -1 };
</script>

<TextAsk
	prompt="What is your mother's maiden name?"
	placeholder="—"
	{provided}
	{withheld}
	{onAnswer}
/>
