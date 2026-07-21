<script>
	// Shared presentational helper for multi-select questions: toggle one or more
	// chips, then hit submit to commit. Score deltas from every selected option
	// are summed before being handed to onAnswer.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	// `onPick` is optional and fires on submit with the selected indices, for
	// questions that need to judge *which* options were chosen rather than just
	// bank their combined score (see Q39Recall).
	let { prompt, options, onAnswer, onPick = () => {} } = $props();

	// prompt → rule → chips → submit. The submit button waits for every chip
	// to have finished arriving (see $lib/reveal.js).
	const seq = $derived.by(() => {
		const c = cascade();
		return {
			prompt: c.text(prompt),
			rule: c.rule(),
			chips: c.items(options.length),
			submit: c.action()
		};
	});

	let selected = $state(new Set());
	let committed = $state(false);

	/** @param {number} i */
	function toggle(i) {
		if (committed) return;
		const next = new Set(selected);
		if (next.has(i)) {
			next.delete(i);
		} else {
			next.add(i);
		}
		selected = next;
		recordDraft({
			format: 'multi-choice',
			value: [...selected].map((index) => options[index].id ?? index),
			labels: [...selected].map((index) => options[index].label)
		});
	}

	function submit() {
		if (!selected.size || committed) return;
		committed = true;
		/** @type {Record<string, number>} */
		const delta = {};
		for (const i of selected) {
			for (const [id, points] of Object.entries(options[i].score ?? {})) {
				delta[id] = (delta[id] ?? 0) + points;
			}
		}
		onPick?.([...selected]);
		onAnswer(delta);
	}
</script>

<div class="multi-pick">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	<div class="chips">
		{#each options as opt, i}
			<button
				class="chip"
				data-sfx="ui-toggle"
				data-reader-option={opt.readerLabel ?? opt.label}
				data-answer-id={opt.id ?? i}
				aria-pressed={selected.has(i)}
				class:on={selected.has(i)}
				style="animation-delay: {seq.chips + i * ITEM_MS}ms"
				disabled={committed}
				onclick={() => toggle(i)}
			>
				<span class="box" data-reader-label>{selected.has(i) ? '✓' : ''}</span>
				<span class="label" data-reader-label>{opt.label}</span>
			</button>
		{/each}
	</div>

	<SubmitAnswer
		disabled={!selected.size}
		{committed}
		delay={seq.submit}
		label={selected.size ? `Submit (${selected.size} selected) →` : 'Submit answer →'}
		onsubmit={submit}
	/>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.multi-pick > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.4s both;
	}
	.chips {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem 1.25rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		color: inherit;
		animation: rise 0.42s both;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.chip:hover {
		border-color: var(--ink);
	}
	.chip.on {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.35rem;
		height: 1.35rem;
		flex-shrink: 0;
		border: 1px solid var(--rule);
		border-radius: 0;
		font-weight: 700;
		color: var(--ink);
	}
	.chip.on .box {
		border-color: var(--ink);
	}
	.label {
		font-size: 1.05rem;
		font-weight: 500;
	}
</style>
