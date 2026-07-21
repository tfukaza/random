<script>
	// recall-trap — the bill for memory-claim, arriving nine questions later at
	// the far end of the same chapter. It branches on the endpoint, the same rule
	// the patience lens and math-test follow: "Strongly agree" is a claim and
	// gets tested, anything softer is an opinion and gets left alone.
	//
	// The two used to be sixteen questions and a chapter break apart. Inside one
	// chapter, nine is the most separation available — so the run between them is
	// doing real work and nothing should be allowed to shorten it.
	//
	// HARD BRANCH — the taker said, in the strongest terms on offer, that they
	// have a good memory. So: what were the exact words? The five options are the
	// real prompt plus four near-misses differing by a single verb or article.
	// This is unfair, and it is meant to be. Nobody memorises the phrasing of a
	// survey item they answered a chapter ago, which is the entire point of
	// having volunteered that you would. Getting it right is genuinely
	// impressive and scores like it.
	//
	// SOFT BRANCH — everyone else gets a sincere question about which kind of
	// memory they trust most. The taxonomy is real, so it reads as the quiz
	// taking an interest rather than setting anything up. No trap, no penalty —
	// here. It is in fact the setup for the scene-recall pair in chapter 4, which
	// probes precisely the faculty they nominate, and per P6 neither question
	// ever admits the connection.
	//
	// Per P6 the branch is NEVER acknowledged; neither version mentions the other.
	//
	// This question was previously a fridge-contents recall keyed to a picnic
	// question that no longer exists.
	import PickList from './PickList.svelte';
	import { MEMORY_TYPES, recall, STRONGLY_AGREE } from './recallState.svelte.js';
	let { onAnswer } = $props();

	// Read once — the orchestrator remounts per question, so nothing to keep
	// reactive. A null claim (deep-link) is not a boast, so it falls to soft.
	const hard = recall.claim === STRONGLY_AGREE;

	// ---------------------------------------------------------------- hard branch
	const hardPrompt =
		'What was the exact phrasing of the question where you told us you have a good memory?';

	// REAL must stay VERBATIM identical to Q40Memory's `prompt`, and each decoy
	// must differ from it by exactly one small thing — a verb, an article, a
	// construction. A decoy that is obviously wrong breaks the question.
	const REAL = 'Do you consider yourself to have a good memory?';
	const phrasings = [
		{ label: 'Would you consider yourself to have a good memory?', real: false },
		{ label: 'Do you consider yourself to have good memory?', real: false },
		{ label: REAL, real: true },
		{ label: 'Do you believe yourself to have a good memory?', real: false },
		{ label: 'Do you consider yourself as having a good memory?', real: false }
	];

	// Right = verified detail-attention that vindicates the boast. Wrong = the
	// boast collapsing, and a heavier honesty hit than most answers carry
	// precisely because nobody asked them to make it.
	const hardOptions = phrasings.map((p) => ({
		label: p.label,
		score: p.real ? { scope: -3, honesty: 3 } : { scope: 2, honesty: -3 }
	}));

	// ---------------------------------------------------------------- soft branch
	// SINGLE-SELECT, and that is load-bearing rather than cosmetic. The answer is
	// the branch key for the scene-recall pair later on, which probes exactly the
	// faculty named here — and "test the memory you are best at" only means
	// something if they had to pick one.
	//
	// It used to be a MultiPick, with a penalty for selecting five or more on the
	// grounds that confidence in every form of human memory is a boast, not a
	// report. That judgement died with multi-select and is deliberately NOT
	// replaced: there is no maximalism to punish when the taker gets one choice.
	const softPrompt = 'Which kind of memory are you most confident in?';

	/** @type {Record<string, Record<string, number>>} */
	const SOFT_SCORES = {
		episodic: { social: 1, scope: -1 },
		semantic: { scope: -1 },
		working: { tempo: 1 },
		prospective: { coord: 1, scope: -1 },
		spatial: { scope: 1 }
	};

	// Built from MEMORY_TYPES so the options and the probes downstream cannot
	// drift apart — see the note on that export. A final "bad at all" option is
	// appended: it is not a faculty, so it is NOT in MEMORY_TYPES, and choosing it
	// sends `recall.type = 'none'`, which the scene routes to the easy tier —
	// admitting you are bad at memory earns an easier test, not a harder one.
	const softOptions = [
		...MEMORY_TYPES.map((t) => ({ label: t.label, score: SOFT_SCORES[t.id] })),
		{ label: "Honestly? I'm bad at all of them", score: { honesty: 1 } }
	];

	/** @param {number} i */
	function keepType(i) {
		recall.type = i < MEMORY_TYPES.length ? MEMORY_TYPES[i].id : 'none';
	}
</script>

{#if hard}
	<PickList prompt={hardPrompt} options={hardOptions} {onAnswer} />
{:else}
	<!-- onSubmit, not onPick: the branch key must be what they committed to, not
	     whatever they clicked on the way there. -->
	<PickList prompt={softPrompt} options={softOptions} {onAnswer} onSubmit={keepType} />
{/if}
