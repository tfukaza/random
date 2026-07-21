<script>
	// scene-recall — the bill for the scene one question earlier, and the payoff
	// for recall-trap's soft branch a chapter before that.
	//
	// THE BRANCH IS THE JOKE. Whichever memory the taker nominated as their
	// strength is the one thing they are now tested on: claim spatial and you are
	// asked what sat below the clock, claim working memory and you are asked for
	// the bus number backwards. Nobody named "the faculty I would like examined";
	// they named the one they were proud of, and the quiz took them at their
	// word. Per P6 this is NEVER acknowledged — no branch mentions the others, and
	// nothing explains why this question arrived.
	//
	// Takers who claimed a good memory in the strongest terms never named a type
	// (recall-trap asked them for exact wording instead), so they get the head
	// count: the one detail in the scene nobody attends to.
	//
	// Correctness comes from sceneModel.js, which derives it from the same grid
	// the scene was drawn on. Nothing here hand-writes an answer key.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import RankList from './RankList.svelte';
	import SceneRecreate from './SceneRecreate.svelte';
	import ScenePinpoint from './ScenePinpoint.svelte';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { latestResponse, recordDraft, recordEvent } from '$lib/questions/metrics.svelte.js';
	import { recall, STRONGLY_AGREE } from './recallState.svelte.js';
	import { scene } from './sceneState.svelte.js';
	import { probeFor } from './sceneModel.js';

	let { onAnswer } = $props();

	// Read once — the orchestrator remounts per question. Two vectors decide the
	// probe: the memory faculty named in recall-trap, and the easy-or-hard slider
	// answered a few questions back (read the same way Q52 reads it). Faculty
	// picks which probe; difficulty picks how hard.
	const difficulty = latestResponse('easy-or-hard')?.value;
	const probe = probeFor(recall.type, recall.claim === STRONGLY_AGREE, difficulty);
	// Deep-linked past the scene. They are still asked, because refusing to ask
	// would tell them something, but nothing is charged for missing it.
	const unseen = !scene.seen;

	const seq = $derived.by(() => {
		const c = cascade();
		c.text(probe.prompt, 40);
		return { rule: c.rule(), body: c.block(), actions: c.action() };
	});

	let choice = $state(/** @type {number | null} */ (null));
	let typed = $state('');
	let committed = $state(false);

	const ready = $derived(probe.format === 'choice' ? choice !== null : typed.trim().length > 0);

	const options = $derived(probe.options ?? []);

	/** @param {string[]} [ordered] ids, when the episodic branch reports them */
	function correct(ordered) {
		if (probe.format === 'order') {
			const answer = /** @type {string[]} */ (probe.answer);
			return ordered?.join(',') === answer.join(',');
		}
		// Choice options each carry their own `correct` flag (a spatial or working
		// probe has several right answers, plus phantom traps), so correctness is
		// the chosen option's flag, not a string match.
		if (probe.format === 'choice') return choice !== null && !!options[choice]?.correct;
		return typed.trim() === probe.answer;
	}

	// Getting it right is the boast holding up, and it scores like it. Getting it
	// wrong costs less than recall-trap's hard branch does, because this claim was
	// milder — naming your best memory is not the same act as insisting, in the
	// strongest terms available, that your memory is good.
	/** @param {boolean} right @returns {Record<string, number>} */
	function scoreOf(right) {
		if (unseen) return {};
		if (right) return { scope: -3, honesty: 2 };
		return { scope: 2, honesty: -2 };
	}

	/** @param {string} value @param {boolean} right */
	function report(value, right) {
		recordDraft({ format: `scene-${probe.format}`, value, label: value });
		recordEvent('scene-recall', { probe: probe.key, correct: right, unseen });
		return scoreOf(right);
	}

	function commit() {
		if (committed || !ready) return;
		committed = true;
		const value =
			probe.format === 'choice'
				? options[/** @type {number} */ (choice)].label
				: typed.trim();
		const delta = report(value, correct());
		setTimeout(() => onAnswer(delta), 620);
	}

	// The episodic branch hands the whole question to RankList, which owns its own
	// prompt, rule and submit — so it is rendered instead of this component's
	// layout rather than inside it.
	/** @param {Array<{id: string, label: string}>} ordered */
	function scoreOrder(ordered) {
		const ids = ordered.map((i) => i.id);
		return report(ids.join(' → '), correct(ids));
	}
</script>

{#if probe.format === 'recreate'}
	<!-- The strong-claim gauntlet owns its whole layout, like the episodic branch
	     hands off to RankList. It scores by placement; the `unseen` guard rides
	     along so a deep-link is not billed for a scene it never saw. -->
	<SceneRecreate {onAnswer} {unseen} />
{:else if probe.format === 'pinpoint'}
	<!-- Spatial: tap where a person stood on a blank canvas. Owns its own layout
	     and scoring, same as the recreate and order branches. -->
	<ScenePinpoint {onAnswer} {unseen} />
{:else if probe.format === 'order'}
	<RankList
		prompt={probe.prompt}
		items={probe.items ?? []}
		topLabel="First"
		bottomLabel="Last"
		toScore={scoreOrder}
		{onAnswer}
	/>
{:else}
	<div class="recall">
		<h2><SplitText text={probe.prompt} stagger={40} /></h2>
		<hr class="rule" style="animation-delay: {seq.rule}ms" />

		<div class="body" style="animation-delay: {seq.body}ms">
			{#if probe.format === 'choice'}
				<div class="cards">
					{#each options as option, i}
						<button
							class="card"
							class:selected={choice === i}
							data-reader-option={option.label}
							aria-pressed={choice === i}
							disabled={committed}
							onclick={() => (choice = i)}
						>
							<span data-reader-label>{option.label}</span>
						</button>
					{/each}
				</div>
			{:else}
				<label class="field">
					<span class="field-label">Your answer</span>
					<input
						type="text"
						inputmode="numeric"
						autocomplete="off"
						spellcheck="false"
						bind:value={typed}
						disabled={committed}
						data-answer-id="scene-digits"
						placeholder="—"
					/>
				</label>
			{/if}
		</div>

		<div class="actions" style="animation-delay: {seq.actions}ms">
			<SubmitAnswer disabled={!ready} {committed} onsubmit={commit} />
		</div>
	</div>
{/if}

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.recall > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	.body {
		margin-bottom: 1.75rem;
		animation: rise 0.42s both;
	}
	.cards {
		display: grid;
		gap: 0.75rem;
	}
	.card {
		padding: 0.9rem 1.1rem;
		font: inherit;
		text-align: left;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}
	.card:hover:not(:disabled) {
		background: var(--accent-soft);
	}
	.card.selected {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
		opacity: 0.7;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.field-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	input {
		width: 100%;
		padding: 0.85rem 1rem;
		font: inherit;
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
	input:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.actions {
		animation: rise 0.42s both;
	}
</style>
