<script>
	// Shared presentational helper for "pick a color palette" questions. Each
	// option renders as a strip of color swatches (no text — pure vibes) and
	// commits only after the taker confirms the selected palette.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	let { prompt, options, onAnswer, onPick = () => {} } = $props();

	const seq = $derived.by(() => {
		const c = cascade();
		return { prompt: c.text(prompt), rule: c.rule(), items: c.items(options.length), submit: c.action() };
	});

	/** @type {number | null} */
	let picked = $state(null);
	let committed = $state(false);

	/** @param {number} i */
	function choose(i) {
		if (committed) return;
		picked = i;
		onPick?.(i);
		recordDraft({ format: 'palette-choice', value: options[i].id ?? i, label: options[i].readerLabel ?? options[i].label ?? `Option ${i + 1}` });
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed) return;
		committed = true;
		setTimeout(() => onAnswer(options[choice].score), 320);
	}
</script>

<div class="palette-pick">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	<div class="grid">
		{#each options as opt, i}
			<button
				class="card"
				data-reader-option={opt.readerLabel ?? opt.label ?? `Color palette ${i + 1}`}
				data-answer-id={opt.id ?? i}
				aria-label={opt.readerLabel ?? opt.label ?? `Color palette ${i + 1}`}
				aria-pressed={picked === i}
				class:picked={picked === i}
				style="animation-delay: {seq.items + i * ITEM_MS}ms"
				disabled={committed}
				onclick={() => choose(i)}
			>
				{#each opt.palette as color, ci}
					<span class="swatch" style="background: {color}; flex: {opt.weights?.[ci] ?? 1}"></span>
				{/each}
			</button>
		{/each}
	</div>
	<SubmitAnswer disabled={picked === null} {committed} delay={seq.submit} onsubmit={submit} />
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.palette-pick > hr {
		animation: draw 0.4s both;
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
		animation: rise 0.42s both;
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
