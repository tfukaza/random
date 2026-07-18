<script>
	// Shared presentational helper for "pick a color palette" questions. Each
	// option renders as a strip of color swatches (no text — pure vibes) and
	// auto-commits on click.
	import SplitText from '$lib/SplitText.svelte';

	let { prompt, options, onAnswer, onPick = () => {} } = $props();

	/** @type {number | null} */
	let picked = $state(null);

	/** @param {number} i */
	function choose(i) {
		picked = i;
		onPick?.(i);
		setTimeout(() => onAnswer(options[i].score), 320);
	}
</script>

<div class="palette-pick">
	<h2><SplitText text={prompt} stagger={14} /></h2>
	<hr class="rule" />
	<div class="grid">
		{#each options as opt, i}
			<button
				class="card"
				class:picked={picked === i}
				style="--i: {i}"
				disabled={picked !== null}
				onclick={() => choose(i)}
			>
				{#each opt.palette as color, ci}
					<span class="swatch" style="background: {color}; flex: {opt.weights?.[ci] ?? 1}"></span>
				{/each}
			</button>
		{/each}
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.palette-pick > hr {
		margin: 0 0 1.75rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	.card {
		display: flex;
		height: 5.5rem;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.45s calc(0.25s + var(--i) * 80ms) both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.card:hover:not(:disabled) {
		transform: translateY(-3px);
		border-color: var(--ink);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
	}
	.card.picked {
		border-color: var(--ink);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
	}
	.card:disabled:not(.picked) {
		opacity: 0.55;
	}
	.swatch {
		flex: 1;
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
