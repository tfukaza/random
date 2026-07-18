<script>
	// Q27 — depends on Q26: you meet a wounded survivor who can't move, and
	// you can't carry him. He'll wait for help, but he's short on supplies.
	// The options are exactly what you packed into the backpack in Q26 (read
	// from the shared pack state). Empty pack (fled with nothing, or a ?q=27
	// deep link) falls back to a single "nothing to give" answer.
	import SplitText from '$lib/SplitText.svelte';
	import { ITEMS } from './backpackItems.js';
	import { pack } from './backpackState.svelte.js';

	let { onAnswer } = $props();

	const carried = ITEMS.filter((it) => pack.items.includes(it.id));

	/** @type {string | null} */
	let picked = $state(null);

	/**
	 * @param {string} id
	 * @param {Record<string, number>} score
	 */
	function give(id, score) {
		if (picked !== null) return;
		picked = id;
		setTimeout(() => onAnswer(score), 700);
	}
</script>

<div class="survivor">
	<p class="premise">
		Crossing the ruins, you find another survivor — hurt, badly. He can't walk, and you don't have
		the strength to carry him. You agree he'll wait here for a rescue party. He's short on
		everything, though, and anything would help.
	</p>
	<h2><SplitText text="Which item do you give him?" stagger={14} /></h2>
	<hr class="rule" />

	{#if carried.length === 0}
		<button
			class="card nothing"
			class:picked={picked === 'nothing'}
			disabled={picked !== null}
			onclick={() => give('nothing', { sage: 1 })}
		>
			<span class="label">You have nothing to give him.</span>
		</button>
	{:else}
		<div class="cards">
			{#each carried as item, i (item.id)}
				<button
					class="card"
					class:picked={picked === item.id}
					style="--i: {i}"
					disabled={picked !== null}
					onclick={() => give(item.id, item.give)}
				>
					<span class="sprite">{@html item.svg}</span>
					<span class="label">{item.name}</span>
				</button>
			{/each}
		</div>
	{/if}
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
	.survivor > hr {
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
