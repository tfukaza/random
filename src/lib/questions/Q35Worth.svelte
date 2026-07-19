<script>
	// Q35 — the second ranking question, and where the mechanic stops being
	// tame. Same interaction Q34 just taught, now pointed at something nobody
	// wants to answer out loud: the counts are chosen so that any ordering is a
	// position, and refusing to have one isn't offered.
	import RankList from './RankList.svelte';
	import { weightByRank } from './rankScore.js';

	let { onAnswer } = $props();

	/** @type {Array<{ id: string, label: string, score: Record<string, number> }>} */
	const items = [
		// Axis values ±1: weightByRank multiplies the top pick by 3. Ranking the
		// human first is the conventional answer; a thousand cats on top is not.
		{ id: 'human', label: '1 human', score: { risk: -1 } },
		{ id: 'dogs', label: '10 dogs', score: { social: 1 } },
		{ id: 'cows', label: '100 cows', score: { scope: -1 } },
		{ id: 'cats', label: '1000 cats', score: { creative: 1 } }
	];

	// Placeholder scoring like every other question — real categories are
	// deferred project-wide.
	/** @param {Array<{ id: string }>} ordered */
	const toScore = (ordered) => weightByRank(items, ordered);
</script>

<RankList
	prompt="If you had to rank the following by value, how would you rank them?"
	{items}
	topLabel="Most valuable"
	bottomLabel="Least valuable"
	{toScore}
	{onAnswer}
/>
