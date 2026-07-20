<script>
	// airport-discard — depends on pack-box. The bag is over the limit by a
	// margin small enough that any single item would fix it, which is the
	// cruelty: there is no "obviously the heaviest thing" to sacrifice, so the
	// choice is purely about what you value least. The options are exactly what
	// you packed (read from the shared box state). An empty box — packed nothing,
	// or a deep link straight here — falls back to a single "nothing to throw
	// away" answer.
	//
	// This replaced a wounded-survivor question, and the inversion is the point:
	// giving something away asked what you would do for a stranger, while
	// throwing something away asks what you will not carry. `discard` scores in
	// boxItems.js were rewritten rather than ported.
	import SplitText from '$lib/SplitText.svelte';
	import { ITEMS } from './boxItems.js';
	import { box } from './boxState.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	let { onAnswer } = $props();

	const carried = ITEMS.filter((it) => box.items.includes(it.id));

	/** @type {string | null} */
	let picked = $state(null);
	/** @type {Record<string, number> | null} */
	let pickedScore = $state(null);
	let committed = $state(false);

	/**
	 * @param {string} id
	 * @param {any} score
	 */
	function discard(id, score) {
		if (committed) return;
		picked = id;
		pickedScore = score;
		const item = carried.find((candidate) => candidate.id === id);
		recordDraft({ format: 'single-choice', value: id, label: item?.name ?? 'Nothing to throw away' });
	}

	function submit() {
		if (picked === null || !pickedScore || committed) return;
		committed = true;
		setTimeout(() => onAnswer(pickedScore ?? {}), 700);
	}
</script>

<div class="airport">
	<p class="premise" data-reader-text>
		You make it to the airport. At the desk they weigh the bag, and it is over — barely. Not by
		much at all. The agent waits while you open it back up.
	</p>
	<h2><SplitText text="Which one do you throw away?" /></h2>
	<hr class="rule" />

	{#if carried.length === 0}
		<button
			class="card nothing"
			data-reader-option="You have nothing to throw away"
			data-answer-id="nothing"
			aria-pressed={picked === 'nothing'}
			class:picked={picked === 'nothing'}
			disabled={committed}
			onclick={() => discard('nothing', { scope: -1 })}
		>
			<span class="label" data-reader-label>You have nothing to throw away.</span>
		</button>
	{:else}
		<div class="cards">
			{#each carried as item, i (item.id)}
				<button
					class="card"
					data-reader-option={item.name}
					data-answer-id={item.id}
					aria-pressed={picked === item.id}
					class:picked={picked === item.id}
					style="--i: {i}"
					disabled={committed}
					onclick={() => discard(item.id, item.discard)}
				>
					<span class="sprite">{@html item.svg}</span>
					<span class="label" data-reader-label>{item.name}</span>
				</button>
			{/each}
		</div>
	{/if}
	<SubmitAnswer disabled={picked === null} {committed} delay={650} onsubmit={submit} />
</div>

<style>
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1rem;
		animation: rise 0.5s both;
	}
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.airport > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	.card {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem 1.15rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.45s calc(0.25s + var(--i, 0) * 80ms) both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			background 0.12s ease;
		font: inherit;
		color: inherit;
	}
	.card:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--ink);
	}
	.card.picked {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
		opacity: 0.55;
	}
	.card.picked:disabled {
		opacity: 1;
	}
	.card.nothing {
		width: 100%;
	}
	.sprite {
		width: 2.4rem;
		height: 2.4rem;
		flex-shrink: 0;
		color: var(--ink);
	}
	.sprite :global(svg) {
		width: 100%;
		height: 100%;
	}
	.label {
		font-size: 1.02rem;
		font-weight: 500;
	}
	@media (max-width: 520px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
