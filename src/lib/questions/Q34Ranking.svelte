<script>
	// Q34 — the taker's first rank-order question, and deliberately tame: four
	// ordinary pleasures, no trick. The point is to teach the mechanic while the
	// stakes are nothing, so that later ranking questions can be far nastier
	// without the interaction itself being the confusing part.
	import RankList from './RankList.svelte';
	import { weightByRank } from './rankScore.js';

	let { onAnswer } = $props();

	/** @type {Array<{ id: string, label: string, score: Record<string, number> }>} */
	const items = [
		// Axis values are small (±1) on purpose: weightByRank multiplies the top
		// pick by 3, so ranks produce ±3 at most.
		{ id: 'vacation', label: 'Taking a vacation', score: { risk: 1 } },
		{ id: 'dinner', label: 'Having a delicious dinner', score: { creative: -1 } },
		{
			id: 'friends',
			label: 'Hanging out with a group of friends',
			score: { social: 1 }
		},
		{ id: 'movie', label: 'Watching a movie in a theater', score: { social: -1 } }
	];

	// Placeholder scoring like every other question — real categories are
	// deferred project-wide.
	/** @param {Array<{ id: string }>} ordered */
	const toScore = (ordered) => weightByRank(items, ordered);
</script>

<RankList
	prompt="If you had to rank these, which would you find most satisfying?"
	{items}
	topLabel="Most satisfying"
	bottomLabel="Least satisfying"
	{toScore}
	{onAnswer}
/>
