<script>
	// Shared presentational helper for pick-one questions. A question component
	// just hands us a prompt + options (each carrying its own score delta) and
	// the onAnswer callback; we render the choices and auto-commit on click.
	// Layout adapts: <=4 options → 2-col cards, more → a compact single column.
	import SplitText from '$lib/SplitText.svelte';

	// `premise` is optional scene-setting shown above the prompt — used by lore
	// arc questions (see docs/lore.md); plain questions just omit it.
	let { premise = '', prompt, options, onAnswer, onPick = () => {} } = $props();

	/** @type {number | null} */
	let picked = $state(null);
	/** @type {{ i: number, x: number, y: number, size: number } | null} */
	let ripple = $state(null);

	const columns = $derived(options.length <= 4 ? 2 : 1);

	/**
	 * @param {number} i
	 * @param {MouseEvent} event
	 */
	function choose(i, event) {
		picked = i;
		onPick?.(i);
		const card = /** @type {HTMLElement} */ (event.currentTarget);
		const rect = card.getBoundingClientRect();
		ripple = {
			i,
			size: Math.max(rect.width, rect.height) * 2.4,
			// keyboard activation has no coords — ripple from the center instead
			x: event.clientX ? event.clientX - rect.left : rect.width / 2,
			y: event.clientY ? event.clientY - rect.top : rect.height / 2
		};
		// let the ripple + picked state play before advancing
		setTimeout(() => onAnswer(options[i].score), 520);
	}
</script>

<div class="pick-list">
	{#if premise}
		<p class="premise">{premise}</p>
	{/if}
	<h2><SplitText text={prompt} stagger={14} /></h2>
	<hr class="rule" />
	<div class="grid" style="--cols: {columns}">
		{#each options as opt, i}
			<button
				class="card"
				class:picked={picked === i}
				style="--i: {i}"
				disabled={picked !== null}
				onclick={(e) => choose(i, e)}
			>
				<span class="label" style={opt.font ? `font-family: ${opt.font}; font-size: 1.4rem;` : ''}
					>{opt.label}</span
				>
				{#if ripple && ripple.i === i}
					<span
						class="ripple"
						style="left: {ripple.x}px; top: {ripple.y}px; width: {ripple.size}px; height: {ripple.size}px;"
					></span>
				{/if}
			</button>
		{/each}
	</div>
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
	.pick-list > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		gap: 1rem;
	}
	.card {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1.15rem 1.25rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.45s calc(0.25s + var(--i) * 80ms) both;
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
	.ripple {
		position: absolute;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.09);
		transform: translate(-50%, -50%) scale(0);
		animation: ripple-out 0.55s ease-out forwards;
		pointer-events: none;
	}
	@keyframes ripple-out {
		to {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0;
		}
	}
	.label {
		font-size: 1.05rem;
		font-weight: 500;
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
