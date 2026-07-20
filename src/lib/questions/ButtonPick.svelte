<script>
	// Shared helper for "which button looks nicest?" — each option renders as an
	// actual button in a distinct design idiom (variant class). Clicking a button
	// both answers the question and demonstrates the style. Auto-commits on click.
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
		recordDraft({ format: 'button-choice', value: options[i].id ?? i, label: options[i].label });
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed) return;
		committed = true;
		setTimeout(() => onAnswer(options[choice].score), 340);
	}
</script>

<div class="button-pick">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	<div class="grid">
		{#each options as opt, i}
			<div
				class="cell"
				class:dim={picked !== null && picked !== i}
				style="animation-delay: {seq.items + i * ITEM_MS}ms"
			>
				<button
					class="btn {opt.variant}"
					data-reader-option={opt.readerLabel ?? opt.label}
					data-answer-id={opt.id ?? i}
					aria-pressed={picked === i}
					disabled={committed}
					onclick={() => choose(i)}
				>
					<span data-reader-label>{opt.label}</span>
				</button>
			</div>
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
	.button-pick > hr {
		animation: draw 0.4s both;
		margin: 0 0 1.75rem;
	}
	.cell {
		animation: rise 0.42s both;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}
	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 7rem;
		padding: 1rem;
		border-radius: var(--radius);
		transition: opacity 0.2s ease;
	}
	.cell.dim {
		opacity: 0.4;
	}

	.btn {
		font: inherit;
		font-weight: 600;
		font-size: 1rem;
		padding: 0.85rem 1.6rem;
		cursor: pointer;
		transition: transform 0.12s ease;
	}
	.btn:disabled {
		cursor: default;
	}
	.btn:not(:disabled):hover {
		transform: translateY(-2px);
	}

	/* 1 — Simple rectangle: a plain bordered rectangle */
	.simple {
		background: var(--ink);
		color: var(--surface);
		border: 1px solid var(--surface);
		border-radius: var(--radius);
	}

	/* 2 — Drop shadow: generic Material-style soft elevation */
	.shadow {
		background: var(--surface);
		color: inherit;
		border: none;
		border-radius: 6px;
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.16),
			0 1px 3px rgba(0, 0, 0, 0.12);
	}

	/* 3 — Thick and bold: heavy border + hard, blur-free black offset shadow */
	.bold {
		background: var(--surface);
		color: #111;
		border: 3px solid #111;
		border-radius: 6px;
		box-shadow: 5px 5px 0 0 #111;
	}
	.bold:not(:disabled):hover {
		transform: translate(2px, 2px);
		box-shadow: 3px 3px 0 0 #111;
	}

	/* 4 — Bubbly: fully rounded pill with a soft, barely-there border */
	.bubbly {
		background: var(--accent-soft);
		color: inherit;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.85rem 1.9rem;
	}
</style>
