<script>
	// recall-trap — the bill for memory-claim, arriving thirteen questions and a
	// chapter break later. It branches on the endpoint, the same rule the
	// patience lens and math-test follow: "Strongly agree" is a claim and gets
	// tested, anything softer is an opinion and gets left alone.
	//
	// HARD BRANCH — the taker said, in the strongest terms on offer, that they
	// have a good memory. So: what were the exact words? The five options are the
	// real prompt plus four near-misses differing by a single verb or article.
	// This is unfair, and it is meant to be. Nobody memorises the phrasing of a
	// survey item they answered a chapter ago, which is the entire point of
	// having volunteered that you would. Getting it right is genuinely
	// impressive and scores like it.
	//
	// SOFT BRANCH — everyone else gets a sincere question about which kinds of
	// memory they trust. The taxonomy is real (episodic, semantic, procedural,
	// working, prospective, spatial), so it reads as the quiz taking an interest
	// rather than setting anything up. No trap, no penalty.
	//
	// Per P6 the branch is NEVER acknowledged; neither version mentions the other.
	//
	// This question was previously a fridge-contents recall keyed to a picnic
	// question that no longer exists.
	import PickList from './PickList.svelte';
	import MultiPick from './MultiPick.svelte';
	import { recall, STRONGLY_AGREE } from './recallState.svelte.js';
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
	const softPrompt = 'Which kinds of memory are you confident in? Pick any that apply.';

	const softOptions = [
		{ label: 'Episodic — things that happened to you', score: { social: 1, scope: -1 } },
		{ label: 'Semantic — facts, names, general knowledge', score: { scope: -1 } },
		{ label: 'Procedural — how to actually do things', score: { creative: -1, scope: -1 } },
		{ label: 'Working — holding something in mind right now', score: { tempo: 1 } },
		{ label: 'Prospective — remembering to do a thing later', score: { coord: 1, scope: -1 } },
		{ label: 'Spatial — routes, layouts, where you put things', score: { scope: 1 } }
	];

	// MultiPick already sums every selected option, so a maximalist answer scores
	// large on its own. This is the judgement on top: confidence in essentially
	// every form of human memory is not a memory report, it is a boast — and
	// claiming none of them, on a question with no penalty for honesty, is worth
	// a little something.
	let picked = $state(/** @type {number[]} */ ([]));
	/** @param {Record<string, number>} score */
	function judgedSoft(score) {
		const delta = { ...score };
		if (picked.length >= 5) delta.honesty = (delta.honesty ?? 0) - 2;
		else if (picked.length === 0) delta.honesty = (delta.honesty ?? 0) + 1;
		return delta;
	}
</script>

{#if hard}
	<PickList prompt={hardPrompt} options={hardOptions} {onAnswer} />
{:else}
	<MultiPick
		prompt={softPrompt}
		options={softOptions}
		onAnswer={(/** @type {Record<string, number>} */ score) => onAnswer(judgedSoft(score))}
		onPick={(/** @type {number[]} */ idx) => (picked = idx)}
	/>
{/if}
