<script>
	// Shared presentational helper for single-slider questions. A question
	// component hands us a prompt, a min/max range, pole labels, and a scoring
	// function that maps the final value to a score delta.
	import SplitText from '$lib/SplitText.svelte';

	// `premise` is optional scene-setting shown above the prompt — used by lore
	// arc questions (see docs/lore.md); plain questions just omit it.
	let {
		premise = '',
		prompt,
		min = 0,
		max = 10,
		leftLabel,
		rightLabel,
		toScore,
		onAnswer
	} = $props();

	// Only the initial midpoint is needed — each question remounts fresh via #key.
	// svelte-ignore state_referenced_locally
	let value = $state(Math.round((min + max) / 2));

	function commit() {
		onAnswer(toScore(value));
	}
</script>

<div class="slider-pick">
	{#if premise}
		<p class="premise">{premise}</p>
	{/if}
	<h2><SplitText text={prompt} stagger={14} /></h2>
	<hr class="rule" />

	<div class="poles">
		<span class="pole">{leftLabel}</span>
		<span class="pole">{rightLabel}</span>
	</div>

	<input class="slider" type="range" {min} {max} bind:value />
	<p class="readout">{value}</p>

	<button class="next" onclick={commit}>Next →</button>
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
	.slider-pick > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}
	.poles {
		display: flex;
		justify-content: space-between;
		font-weight: 500;
		color: var(--muted);
		margin-bottom: 0.75rem;
		gap: 1rem;
	}
	.slider {
		width: 100%;
		accent-color: var(--ink);
		height: 2rem;
		cursor: pointer;
	}
	.readout {
		text-align: center;
		color: var(--ink);
		font-weight: 700;
		font-size: 1.5rem;
		font-variant-numeric: tabular-nums;
		margin: 0.75rem 0 2rem;
	}
	.next {
		display: block;
		margin-left: auto;
		padding: 0.75rem 1.5rem;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.25s ease;
	}
	.next:hover {
		background: #0f0f0f;
	}
</style>
