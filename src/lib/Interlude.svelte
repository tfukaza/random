<script>
	// A breather between questions: no score, no № — just a message and a
	// Continue button. Content comes from src/lib/interludes.js.
	import { onMount } from 'svelte';
	import SplitText from '$lib/SplitText.svelte';
	import { playSfx } from '$lib/audio/audio.svelte.js';

	let { message, onNext } = $props();

	onMount(() => {
		void playSfx('page-turn');
	});
</script>

<div class="interlude">
	<p class="eyebrow">Interlude</p>
	<div class="fleuron" aria-hidden="true">
		<hr class="rule" />
		<span>❦</span>
		<hr class="rule" />
	</div>
	<h2><SplitText text={message} delay={250} stagger={30} /></h2>
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
