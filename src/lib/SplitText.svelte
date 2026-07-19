<script>
	// Word-by-word text reveal. Each word rises into place in turn, which reads
	// as language arriving rather than as characters being typed — and it stays
	// legible at the 1/20th speed the patience band imposes, where a per-letter
	// stagger turned every prompt into a slow ransom note.
	//
	// The whole string is exposed once via `aria-label` and the words are hidden
	// from the accessibility tree, so a screen reader announces one sentence
	// rather than a stream of fragments.
	//
	// `stagger` is per WORD now (it used to be per letter). Callers that need a
	// long prompt to keep pace should lower it rather than reach for letters.
	import { WORD_MS } from '$lib/reveal.js';

	/** @type {{ text: string, delay?: number, stagger?: number }} */
	let { text, delay = 0, stagger = WORD_MS } = $props();

	// Splitting on whitespace and re-emitting single spaces is deliberate: the
	// browser must still be able to wrap between words, and an inline-block
	// span can never break internally.
	const words = $derived(String(text ?? '').trim().match(/\S+/g) ?? []);
</script>

<span class="split" aria-label={text}>
	{#each words as word, i}{#if i > 0}{' '}{/if}<span
			class="word"
			aria-hidden="true"
			style="animation-delay: {delay + i * stagger}ms">{word}</span
		>{/each}
</span>

<style>
	.word {
		display: inline-block;
		animation: word-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes word-in {
		from {
			opacity: 0;
			transform: translateY(0.4em);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
