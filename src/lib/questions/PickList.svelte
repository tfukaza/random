<script>
	// Shared presentational helper for pick-one questions. A question component
	// just hands us a prompt + options (each carrying its own score delta) and
	// the onAnswer callback; we render an editable choice and a separate submit.
	// Layout adapts: <=4 options → 2-col cards, more → a compact single column.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	// `premise` is optional scene-setting shown above the prompt — used by lore
	// arc questions (see docs/lore.md); plain questions just omit it.
	// `children` (implicit snippet) renders a figure between the prompt's rule
	// and the options — for questions built around a diagram (see Q33Snakes).
	let {
		premise = '',
		prompt,
		options,
		onAnswer,
		onPick = () => {},
		// Fires once, synchronously, when submit is pressed — with the index the
		// taker actually committed to. Use this (not `onPick`) for side effects
		// that must survive a change of mind: `onPick` fires on every selection,
		// including ones the taker then picks their way back out of. Running
		// before the 520ms advance means a visible effect still lands on the card
		// they are looking at.
		onSubmit = () => {},
		children = undefined
	} = $props();

	// Reveal order: premise → prompt (word by word) → rule → figure → cards.
	// Delays are computed rather than hand-tuned so a long prompt pushes the
	// cards later instead of them racing it. See $lib/reveal.js.
	const seq = $derived.by(() => {
		const c = cascade();
		return {
			premise: premise ? c.text(premise) : 0,
			prompt: c.text(prompt),
			rule: c.rule(),
			figure: children ? c.block() : 0,
			cards: c.items(options.length),
			submit: c.action()
		};
	});

	/** @type {number | null} */
	let picked = $state(null);
	/** @type {{ i: number, x: number, y: number, size: number } | null} */
	let ripple = $state(null);
	let committed = $state(false);

	const columns = $derived(options.length <= 4 ? 2 : 1);

	/**
	 * @param {number} i
	 * @param {MouseEvent} event
	 */
	function choose(i, event) {
		if (committed) return;
		picked = i;
		onPick?.(i);
		recordDraft({ format: 'single-choice', value: options[i].id ?? i, label: options[i].label });
		const card = /** @type {HTMLElement} */ (event.currentTarget);
		const rect = card.getBoundingClientRect();
		ripple = {
			i,
			size: Math.max(rect.width, rect.height) * 2.4,
			// keyboard activation has no coords — ripple from the center instead
			x: event.clientX ? event.clientX - rect.left : rect.width / 2,
			y: event.clientY ? event.clientY - rect.top : rect.height / 2
		};
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed) return;
		committed = true;
		onSubmit?.(choice);
		setTimeout(() => onAnswer(options[choice].score), 520);
	}
</script>

<div class="pick-list">
	{#if premise}
		<p class="premise"><SplitText text={premise} delay={seq.premise} /></p>
	{/if}
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	{#if children}
		<div class="figure" style="animation-delay: {seq.figure}ms">{@render children()}</div>
	{/if}
	<div class="grid" style="--cols: {columns}">
		{#each options as opt, i}
			<button
				class="card"
				data-reader-option={opt.readerLabel ?? opt.label}
				data-answer-id={opt.id ?? i}
				aria-pressed={picked === i}
				class:picked={picked === i}
				style="animation-delay: {seq.cards + i * ITEM_MS}ms"
				disabled={committed}
				onclick={(e) => choose(i, e)}
			>
				<span data-reader-label class="label" style={opt.font ? `font-family: ${opt.font}; font-size: 1.4rem;` : ''}
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
	<SubmitAnswer disabled={picked === null} {committed} delay={seq.submit} onsubmit={submit} />
</div>

<style>
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1rem;
	}
	.figure {
		animation: rise 0.42s both;
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
		animation: draw 0.4s both;
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
		animation: rise 0.42s both;
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
