<script>
	// A breather between questions: no score, no № — just a message and a
	// Continue button. Content comes from src/lib/interludes.js.
	import { onMount } from 'svelte';
	import SplitText from '$lib/SplitText.svelte';
	import { playSfx } from '$lib/audio/audio.svelte.js';

	// `detail` is an optional smaller paragraph under the headline, for the rare
	// interlude that has to explain something rather than just breathe. `eyebrow`
	// overrides the "Interlude" label — the opening one is not an interlude
	// between anything, so calling it one would be a small lie on the first
	// screen the taker ever reads.
	let { message, onNext, detail = '', eyebrow = 'Interlude' } = $props();

	onMount(() => {
		void playSfx('page-turn');
	});
</script>

<div class="interlude">
	<p class="eyebrow" data-reader-text>{eyebrow}</p>
	<div class="fleuron" aria-hidden="true">
		<hr class="rule" />
		<span>❦</span>
		<hr class="rule" />
	</div>
	<h2><SplitText text={message} delay={250} stagger={30} /></h2>
	{#if detail}
		<p class="detail" data-reader-text>{detail}</p>
	{/if}
	<button class="continue" onclick={onNext}><span class="continue-label">Continue</span></button>
</div>

<style>
	.interlude {
		text-align: center;
		padding: 3rem 0 1.5rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.25em;
		font-size: 0.7rem;
		color: var(--muted);
		margin: 0 0 1.25rem;
		animation: rise 0.45s both;
	}
	.fleuron {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 12rem;
		margin: 0 auto 1.75rem;
	}
	.fleuron .rule {
		flex: 1;
		animation: draw 0.5s 0.15s both;
	}
	.fleuron span {
		color: var(--ink);
		font-size: 1.1rem;
		line-height: 1;
		animation: rise 0.4s 0.1s both;
	}
	h2 {
		font-size: 2.1rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 2.5rem;
	}
	.detail {
		max-width: 30rem;
		margin: -1.5rem auto 2.5rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--muted);
		animation: rise 0.5s 0.8s both;
	}
	.continue {
		position: relative;
		overflow: hidden;
		padding: 0.85rem 2.25rem;
		font-size: 1rem;
		font-weight: 600;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.5s 1.1s both;
		transition: transform 0.12s ease;
	}
	.continue::before {
		content: '';
		position: absolute;
		inset: 0;
		background: #0f0f0f;
		transform: translateX(-101%);
		transition: transform 0.3s ease;
	}
	.continue:hover::before {
		transform: translateX(0);
	}
	.continue:hover {
		transform: translateY(-2px);
	}
	.continue-label {
		position: relative;
	}
</style>
