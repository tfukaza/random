<script>
	// Shared presentational helper for single-slider questions. A question
	// component hands us a prompt, a min/max range, pole labels, and a scoring
	// function that maps the final value to a score delta.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	// `premise` is optional scene-setting shown above the prompt — used by lore
	// arc questions (see docs/lore.md); plain questions just omit it.
	//
	// `step`, `format` and `children` are also optional, so the plain 1–7 callers
	// (Q13, Q14, Q29, Q48) are unaffected. `children` is a snippet handed the live
	// value, rendered between the rule and the slider — that's the hook for a
	// question that wants a picture reacting as you drag (see Q49).
	/** @type {{
	 *   premise?: string,
	 *   prompt: string,
	 *   min?: number,
	 *   max?: number,
	 *   step?: number,
	 *   leftLabel: string,
	 *   rightLabel: string,
	 *   format?: (value: number) => string,
	 *   children?: import('svelte').Snippet<[number]>,
	 *   toScore: (value: number) => Record<string, number>,
	 *   onAnswer: (delta: Record<string, number>) => void
	 * }} */
	let {
		premise = '',
		prompt,
		min = 0,
		max = 10,
		step = 1,
		leftLabel,
		rightLabel,
		format = (v) => String(v),
		children,
		toScore,
		onAnswer
	} = $props();

	// Only the initial midpoint is needed — each question remounts fresh via #key.
	// svelte-ignore state_referenced_locally
	const initialValue = Math.round((min + max) / 2);
	let value = $state(initialValue);
	let lastRecordedValue = $state(initialValue);

	let touched = $state(false);
	let committed = $state(false);
	/** @param {Event} e */
	function onSlide(e) {
		const next = Number(/** @type {HTMLInputElement} */ (e.currentTarget).value);
		const previous = lastRecordedValue;
		lastRecordedValue = next;
		touched = true;
		recordDraft(
			{ format: 'scalar', value: next, label: format(next) },
			{ scalarPreviousValue: previous }
		);
	}

	function commit() {
		if (committed) return;
		// The visible midpoint is a real answer, even when the taker never moves
		// the thumb. Record it at submission time without manufacturing a change.
		if (!touched) recordDraft({ format: 'scalar', value, label: format(value) });
		committed = true;
		onAnswer(toScore(value));
	}

	// premise → prompt → rule → figure → pole labels → slider → readout → Next.
	// `action()` deliberately waits for everything above to have *finished*, so
	// the button never sits there inviting an answer to a half-read question.
	const seq = $derived.by(() => {
		const c = cascade();
		return {
			premise: premise ? c.text(premise) : 0,
			prompt: c.text(prompt),
			rule: c.rule(),
			figure: children ? c.block() : 0,
			poles: c.block(),
			slider: c.block(),
			readout: c.block(),
			next: c.action()
		};
	});
</script>

<div class="slider-pick">
	{#if premise}
		<p class="premise"><SplitText text={premise} delay={seq.premise} /></p>
	{/if}
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	{#if children}
		<div class="figure" style="animation-delay: {seq.figure}ms">{@render children(value)}</div>
	{/if}

	<div class="poles" style="animation-delay: {seq.poles}ms">
		<span class="pole" data-reader-option={leftLabel}><span data-reader-label>{leftLabel}</span></span>
		<span class="pole" data-reader-option={rightLabel}><span data-reader-label>{rightLabel}</span></span>
	</div>

	<input
		class="slider"
		type="range"
		{min}
		{max}
		{step}
		bind:value
		data-answer-id="value"
		oninput={onSlide}
		style="animation-delay: {seq.slider}ms"
	/>
	<p class="readout" style="animation-delay: {seq.readout}ms">{format(value)}</p>

	<SubmitAnswer {committed} delay={seq.next} onsubmit={commit} />
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
	.slider-pick > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.4s both;
	}
	.poles {
		display: flex;
		justify-content: space-between;
		font-weight: 500;
		color: var(--muted);
		margin-bottom: 0.75rem;
		gap: 1rem;
		animation: rise 0.42s both;
	}
	.slider {
		width: 100%;
		accent-color: var(--ink);
		height: 2rem;
		cursor: pointer;
		animation: rise 0.42s both;
		-webkit-user-select: none;
		user-select: none;
	}
	.readout {
		text-align: center;
		color: var(--ink);
		font-weight: 700;
		font-size: 1.5rem;
		font-variant-numeric: tabular-nums;
		margin: 0.75rem 0 2rem;
		animation: rise 0.42s both;
	}
</style>
