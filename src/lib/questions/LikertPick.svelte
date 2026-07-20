<script module>
	// The five-point agree/disagree row — the single most recognizable input in
	// the genre, and the one the quiz plays completely straight.
	//
	// SHARED SO THE FORMAT CANNOT DRIFT. memory-claim and terms-consent sit next
	// to each other in chapter 3 and must be visually indistinguishable as
	// inputs: the whole setup is that the second one is the same ordinary survey
	// item as the first, only with four thousand words attached. They were
	// briefly two hand-rolled rows with the same labels, which is exactly the
	// arrangement that drifts the moment one gets restyled.
	//
	// artistic-claim uses this too. Its Likert is restyled by the taker's own
	// font/palette/button choices — that is its entire payoff — so every visual
	// property here is driven by a `--likert-*` custom property with a plain
	// default. The LAYOUT (grid, order, sizing, stagger) is fixed and identical
	// for all three; only colour, face and button shape vary.
	//
	// Ordered weak → strong. Consumers index into this order, so appending or
	// reordering breaks their score tables and recall-trap's STRONGLY_AGREE.
	export const LIKERT = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
</script>

<script>
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	/**
	 * @type {{
	 *   prompt: string,
	 *   toScore: (i: number) => Record<string, number>,
	 *   onAnswer: (delta: Record<string, number>) => void,
	 *   onPick?: (i: number) => void,
	 *   chipVariant?: string,
	 *   locked?: boolean,
	 *   lockedHint?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		prompt,
		toScore,
		onAnswer,
		onPick = () => {},
		chipVariant = '',
		locked = false,
		lockedHint = '',
		children = undefined
	} = $props();

	// prompt → rule → [whatever the question puts in between] → the row.
	const seq = $derived.by(() => {
		const c = cascade();
		const p = c.text(prompt);
		const rule = c.rule();
		const body = children ? c.block() : 0;
		return { prompt: p, rule, body, likert: c.items(LIKERT.length), submit: c.action() };
	});

	let picked = $state(/** @type {number | null} */ (null));
	let committed = $state(false);

	/** @param {number} i */
	function choose(i) {
		if (committed || locked) return;
		picked = i;
		onPick(i);
		recordDraft({ format: 'likert', value: i, label: LIKERT[i] });
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed || locked) return;
		committed = true;
		setTimeout(() => onAnswer(toScore(choice)), 520);
	}
</script>

<div class="likert-q">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	{#if children}
		<div class="body" style="animation-delay: {seq.body}ms">{@render children()}</div>
	{/if}

	<div class="likert" class:locked>
		{#each LIKERT as label, i}
			<button
				class="chip {chipVariant}"
				data-sfx="none"
				data-reader-option={label}
				data-answer-id={i}
				aria-pressed={picked === i}
				class:picked={picked === i}
				class:dim={picked !== null && picked !== i}
				style="animation-delay: {seq.likert + i * ITEM_MS}ms"
				disabled={locked || committed}
				onclick={() => choose(i)}
			>
				<span data-reader-label>{label}</span>
			</button>
		{/each}
	</div>
	<SubmitAnswer disabled={picked === null || locked} {committed} delay={seq.submit} onsubmit={submit} />

	{#if locked && lockedHint}
		<p class="hint">{lockedHint}</p>
	{/if}
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.likert-q > hr {
		margin: 0 0 1.25rem;
	}
	.body {
		animation: rise 0.42s both;
	}

	.likert {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.6rem;
		transition: opacity 0.3s ease;
	}
	.likert.locked {
		opacity: 0.4;
	}
	.chip {
		padding: 0.8rem 0.5rem;
		font: inherit;
		font-family: var(--likert-font, inherit);
		font-size: 0.82rem;
		font-weight: var(--likert-weight, 500);
		color: var(--likert-color, inherit);
		text-align: center;
		background: var(--likert-bg, var(--surface));
		border: var(--likert-border, 1px solid var(--border));
		border-radius: var(--likert-radius, var(--radius));
		box-shadow: var(--likert-shadow, none);
		cursor: pointer;
		animation: rise 0.42s both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			background 0.12s ease,
			opacity 0.2s ease;
	}
	.chip:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--likert-hover-border, var(--ink));
	}
	.chip.picked {
		border-color: var(--likert-picked-border, var(--ink));
		background: var(--likert-picked-bg, var(--accent-soft));
	}
	/* No-op unless a consumer opts in — artistic-claim fades the roads not taken
	   instead of highlighting the one that was. */
	.chip.dim {
		opacity: var(--likert-dim, 1);
	}

	/* Button shapes, mirroring button-taste. Only artistic-claim passes one; the
	   plain row leaves chipVariant empty and none of these match. --likert-outline
	   is whatever the consumer's text colour is. */
	.chip.simple {
		border: none;
		border-radius: 8px;
	}
	.chip.shadow {
		border: none;
		border-radius: 6px;
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.16),
			0 1px 3px rgba(0, 0, 0, 0.12);
	}
	.chip.bold {
		border: 3px solid var(--likert-outline, var(--ink));
		border-radius: 6px;
		box-shadow: 5px 5px 0 0 var(--likert-outline, var(--ink));
	}
	.chip.bold:hover:not(:disabled) {
		transform: translate(2px, 2px);
		box-shadow: 3px 3px 0 0 var(--likert-outline, var(--ink));
	}
	.chip.bubbly {
		border: 1px solid var(--likert-outline, var(--ink));
		border-radius: 999px;
	}
	.chip:disabled {
		cursor: default;
	}

	.hint {
		margin: 0.9rem 0 0;
		font-size: 0.72rem;
		text-align: center;
		color: var(--muted);
		font-style: italic;
	}

	@media (max-width: 560px) {
		.likert {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>
