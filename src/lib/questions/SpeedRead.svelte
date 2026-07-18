<script>
	// RSVP (rapid serial visual presentation) reader — the "speed reading app"
	// format: one word at a time in a fixed spot, with a pivot letter tinted and
	// pinned dead center so the eye never has to travel. Fires `onDone` once the
	// last word has had its moment.
	import { onMount } from 'svelte';

	let { text, wpm = 650, onDone } = $props();

	// svelte-ignore state_referenced_locally
	const words = String(text).split(/\s+/).filter(Boolean);
	// svelte-ignore state_referenced_locally
	const delay = 60000 / wpm;

	let i = $state(0);

	const current = $derived(words[i] ?? '');

	// Pivot ("optimal recognition point") — roughly a third into the word, which
	// is where the eye naturally lands.
	const parts = $derived.by(() => {
		const w = current;
		if (!w) return { before: '', pivot: '', after: '' };
		const idx = w.length <= 1 ? 0 : w.length <= 5 ? 1 : w.length <= 9 ? 2 : 3;
		return { before: w.slice(0, idx), pivot: w[idx], after: w.slice(idx + 1) };
	});

	onMount(() => {
		let cancelled = false;
		/** @type {ReturnType<typeof setTimeout>} */
		let t;
		let n = 0;
		const tick = () => {
			if (cancelled) return;
			if (n + 1 < words.length) {
				n += 1;
				i = n;
				t = setTimeout(tick, delay);
			} else {
				// Let the final word linger one beat before handing off.
				t = setTimeout(() => !cancelled && onDone?.(), delay);
			}
		};
		t = setTimeout(tick, delay);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	});
</script>

<div class="rsvp" aria-live="off">
	<span class="tick tick--top"></span>
	<div class="word">
		<span class="before">{parts.before}</span><span class="pivot">{parts.pivot}</span><span
			class="after">{parts.after}</span
		>
	</div>
	<span class="tick tick--bottom"></span>
</div>

<style>
	.rsvp {
		position: relative;
		padding: 2.5rem 0;
		margin-bottom: 1rem;
	}
	/* Fixation guides above and below the pivot column. */
	.tick {
		position: absolute;
		left: 50%;
		width: 1px;
		height: 0.6rem;
		background: var(--rule);
	}
	.tick--top {
		top: 1.5rem;
	}
	.tick--bottom {
		bottom: 1.5rem;
	}
	/* Three columns keep the pivot glyph pinned to the exact center, whatever
	   the word length. */
	.word {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: baseline;
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: clamp(1.5rem, 5vw, 2.25rem);
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.before {
		text-align: right;
	}
	.after {
		text-align: left;
	}
	.pivot {
		color: #c0392b;
	}
</style>
