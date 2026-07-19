<script>
	// Q25 — a dual-thumb range slider spanning A–Z, asked with total sincerity.
	// The absurdity is that "your favorite contiguous slice of the alphabet" is
	// presented as a meaningful personality signal, with a serious UI to match.
	//
	// The twist: `redact` makes the question text and the Next button lose any
	// letter outside the chosen span. Starting at A–Y everything reads normally;
	// narrow the range and the interface itself erodes into gibberish.
	import RangePick from './RangePick.svelte';
	let { onAnswer } = $props();

	const prompt = 'If you had to choose a subset of the alphabet, which would you choose?';
	const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	// A *subset* — so selecting all 26 letters is not allowed, and it has to be
	// an actual range, so both thumbs can't sit on the same letter (no "L – L").
	const MAX_SPAN = LETTERS.length - 1;
	const MIN_SPAN = 2;

	/** @param {number} low @param {number} high */
	function toScore(low, high) {
		const span = high - low + 1;
		// Grabbing nearly the whole alphabet is maximalism; a defiant few
		// letters is a minimalist flex that costs the UI its own words.
		if (span >= 20) return { scope: 2, risk: 1 };
		if (span <= 4) return { creative: 2, risk: 2, scope: -2 };
		// Any middling span is the same mild detail-orientation either way.
		return { scope: -1 };
	}
</script>

<RangePick
	{prompt}
	labels={LETTERS}
	startLow={0}
	startHigh={LETTERS.length - 2}
	maxSpan={MAX_SPAN}
	minSpan={MIN_SPAN}
	redact
	{toScore}
	{onAnswer}
/>
