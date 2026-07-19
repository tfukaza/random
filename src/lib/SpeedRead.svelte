<script>
	// RSVP reader: one token at a time in a fixed spot, so the eye never moves.
	// Used by PatienceLens to fire an entire question past a taker who claimed to
	// be impatient.
	//
	// The clock is a rAF accumulator against performance.now(), NOT setInterval.
	// A 120ms interval starved by a paint drops words with no way to notice or
	// recover; an accumulator stays phase-locked. It also means a hidden tab
	// pauses the read instead of racing the whole question past an empty screen.
	import { WORD_MS } from '$lib/reveal.js';
	import { playReaderTick } from '$lib/audio/audio.svelte.js';

	/** @typedef {{ w: string, hold?: number, tone?: 'num' | 'body' | 'chunk' }} Token */
	/** @type {{
	 *   tokens: Token[],
	 *   sentence: string,
	 *   wpm?: number,
	 *   delay?: number,
	 *   onDone?: () => void
	 * }} */
	let { tokens, sentence, wpm = 500, delay = 0, onDone = () => {} } = $props();

	// app.css zeroes CSS animation durations under reduced motion but cannot
	// touch a rAF loop — so a reduced-motion taker would get the flicker with no
	// mitigation whatsoever, which is worse than doing nothing. Gate in markup.
	const reduced =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	const beat = $derived(60000 / wpm);
	let i = $state(-1);
	const current = $derived(i >= 0 && i < tokens.length ? tokens[i] : null);

	// Pivot letter, pinned dead centre — the point of RSVP is that the eye never
	// has to travel. Long chunks (formulae) are shown whole with no pivot.
	const parts = $derived.by(() => {
		const t = current;
		if (!t || t.tone === 'chunk') return null;
		const w = t.w;
		const p = w.length <= 1 ? 0 : w.length <= 5 ? 1 : w.length <= 9 ? 2 : 3;
		return { before: w.slice(0, p), pivot: w[p], after: w.slice(p + 1) };
	});

	/** @param {Token} t */
	function holdFor(t) {
		// Formulae can't be skimmed at any speed, so chunks keep an absolute floor.
		if (t.tone === 'chunk') return Math.max(700, t.w.length * 32);
		let ms = beat * (1 + (t.hold ?? 0));
		// Let punctuation breathe, or clauses run together into mush.
		if (/[.;:!?]$/.test(t.w)) ms += beat;
		else if (/[,—–]$/.test(t.w)) ms += beat * 0.5;
		return ms;
	}

	$effect(() => {
		if (reduced) return;
		let raf = 0;
		let fired = false;
		let started = false;
		/** @type {number | null} */
		let due = null;
		const t0 = performance.now() + delay;

		const step = (/** @type {number} */ now) => {
			if (now >= t0) {
				if (!started) {
					started = true;
					i = 0;
					playReaderTick();
					due = now + holdFor(tokens[0]);
				} else if (due !== null && now >= due) {
					if (i + 1 < tokens.length) {
						i += 1;
						playReaderTick();
						due = now + holdFor(tokens[i]);
					} else if (!fired) {
						fired = true;
						onDone();
					}
				}
			}
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		// Without this, unmounting mid-read (bail-out, or the orchestrator
		// advancing) leaves a live loop that calls onDone on a dead component.
		return () => cancelAnimationFrame(raf);
	});
</script>

{#if reduced}
	<!-- Terminal state, no motion: the same words, all at once. -->
	<div class="static">
		<p>{sentence}</p>
		<button class="ack" onclick={() => onDone()}>I've read it</button>
	</div>
{:else}
	<div class="reader" aria-hidden="true">
		<span class="tick" aria-hidden="true"></span>
		{#if current}
			{#if parts}
				<span class="word" class:num={current.tone === 'num'}>
					<span class="before">{parts.before}</span><span class="pivot">{parts.pivot}</span><span
						class="after">{parts.after}</span
					>
				</span>
			{:else}
				<span class="chunk">{current.w}</span>
			{/if}
		{/if}
		<span class="tick tick--low" aria-hidden="true"></span>
	</div>
	<!-- One clean sentence for assistive tech, rather than a stream of fragments. -->
	<p class="sr-only">{sentence}</p>
{/if}

<style>
	.reader {
		position: relative;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		/* Fixed height and fixed columns: nothing may shift as words change. */
		height: 5.5rem;
		margin: 0 0 1.5rem;
		font-size: 1.6rem;
		line-height: 1;
	}
	.word {
		display: contents;
	}
	.before {
		grid-column: 1;
		text-align: right;
		color: var(--muted);
	}
	.pivot {
		grid-column: 2;
		color: var(--ink);
		font-weight: 600;
	}
	.after {
		grid-column: 3;
		text-align: left;
		color: var(--muted);
	}
	.word.num .before,
	.word.num .after,
	.word.num .pivot {
		color: #7d0f13;
		font-weight: 700;
	}
	.chunk {
		grid-column: 1 / -1;
		text-align: center;
		font-size: 1.15rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	/* Hairlines marking the fixation point, so the eye has somewhere to rest. */
	.tick {
		position: absolute;
		top: 0.5rem;
		left: 50%;
		width: 1px;
		height: 0.6rem;
		background: var(--rule);
	}
	.tick--low {
		top: auto;
		bottom: 0.5rem;
	}

	.static p {
		margin: 0 0 1.25rem;
		font-size: 1.05rem;
		line-height: 1.6;
	}
	.ack {
		padding: 0.6rem 1.2rem;
		font: inherit;
		font-weight: 600;
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
