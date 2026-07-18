<script>
	// Q30 — the payoff for Q29. The question is the same either way; only the
	// *delivery* changes, and it's chosen by the patience you claimed:
	//
	//   1–2 (impatient) → RSVP speed-reader. Question and each option blink past
	//                     once, far too fast, and then you're asked to answer
	//                     using checkboxes labelled only 1–4. An escape hatch
	//                     ("I actually prefer normal") drops you into normal mode.
	//   6–7 (patient)   → the same words, revealed one at a time over a full
	//                     minute. You asked for patience; here it is.
	//   3–5 / unknown   → ordinary presentation.
	//
	// Reads `patienceState`, written by Q29. Deep-linking straight here finds it
	// null, which falls back to normal — same convention as Q27Survivor.
	import { onMount } from 'svelte';
	import SpeedRead from './SpeedRead.svelte';
	import { patience } from './patienceState.svelte.js';

	let { onAnswer } = $props();

	const PROMPT =
		'Is your preference from the previous question reflected in the media you consume? For example: TikTok versus a full-length movie, or short tweets versus a long novel.';

	const OPTIONS = [
		'My preference applies to the type of stuff I watch.',
		'My preference applies to the type of things I read.',
		'My preference applies to my taste in music too.',
		'My preference applies to how I talk to people.'
	];

	const WORDS = PROMPT.split(/\s+/);
	const FAST_WPM = 650;
	// ~2.4s a word over 27 words — comfortably past the one-minute mark.
	const SLOW_MS = 2400;

	let bailed = $state(false);
	let forced = $state(''); // dev-only override

	const mode = $derived.by(() => {
		// Debug override wins over everything, so any mode stays testable even
		// after bailing out.
		if (forced) return forced;
		if (bailed) return 'normal';
		const v = patience.value;
		if (typeof v !== 'number') return 'normal';
		if (v <= 2) return 'fast';
		if (v >= 6) return 'slow';
		return 'normal';
	});

	/** 'question' → 'options' → 'answer' (fast); 'question' → 'answer' (slow) */
	let phase = $state('answer');
	let optIndex = $state(0);
	let revealed = $state(0);
	let selected = $state(new Set());
	let committed = $state(false);

	// Restart the presentation whenever the mode changes (including bailing out).
	$effect(() => {
		const m = mode;
		phase = m === 'normal' ? 'answer' : 'question';
		optIndex = 0;
		revealed = 0;
	});

	// Slow mode: uncover the prompt one word at a time. `n` is a plain local so
	// the effect doesn't depend on the state it writes.
	$effect(() => {
		if (mode !== 'slow' || phase !== 'question') return;
		let cancelled = false;
		/** @type {ReturnType<typeof setTimeout>} */
		let t;
		let n = 0;
		const tick = () => {
			if (cancelled) return;
			n += 1;
			revealed = n;
			if (n >= WORDS.length) {
				phase = 'answer';
				return;
			}
			t = setTimeout(tick, SLOW_MS);
		};
		t = setTimeout(tick, SLOW_MS);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	});

	function bail() {
		bailed = true;
		// Clear any debug override too, so bailing always actually lands you in
		// normal mode rather than being outvoted by the panel.
		forced = '';
	}

	/** @param {number} i */
	function toggle(i) {
		const next = new Set(selected);
		next.has(i) ? next.delete(i) : next.add(i);
		selected = next;
	}

	function submit() {
		if (committed) return;
		committed = true;
		const n = selected.size;
		setTimeout(() => onAnswer(n >= 3 ? { connector: 3 } : { sage: 2 }), 600);
	}
</script>

<div class="media">
	{#if mode === 'fast' && phase !== 'answer'}
		<!-- Blink-and-you-miss-it delivery. -->
		{#if phase === 'question'}
			{#key 'prompt'}
				<SpeedRead
					text={PROMPT}
					wpm={FAST_WPM}
					onDone={() => {
						phase = 'options';
						optIndex = 0;
					}}
				/>
			{/key}
		{:else}
			<p class="stream-label">Option {optIndex + 1} of {OPTIONS.length}</p>
			{#key optIndex}
				<SpeedRead
					text={OPTIONS[optIndex]}
					wpm={FAST_WPM}
					onDone={() => {
						if (optIndex + 1 < OPTIONS.length) optIndex += 1;
						else phase = 'answer';
					}}
				/>
			{/key}
		{/if}
	{:else if mode === 'slow' && phase === 'question'}
		<!-- Same words, one every 2.4 seconds. -->
		<!-- The space is emitted as an expression: a literal trailing space inside
		     the span gets stripped by the compiler, jamming the words together. -->
		<h2 class="slow">
			{#each WORDS as w, i}<span class="w" class:shown={i < revealed}>{w}</span>{' '}{/each}
		</h2>
		{#if revealed >= 2}
			<!-- Mercy valve: two words in, the patience you claimed is already
			     being tested, so offer the same way out the fast mode gets. -->
			<div class="actions actions--solo">
				<button class="ghost" onclick={bail}>Sorry — I actually prefer normal</button>
			</div>
		{/if}
	{:else}
		{#if mode === 'fast'}
			<!-- No second chance: the prompt and options already went past. All
			     that's left is the numbers, which is the whole joke. -->
			<p class="gone">That was the question, and those were your options.</p>
		{:else}
			<h2>{PROMPT}</h2>
		{/if}
		<hr class="rule" />

		<div class="choices">
			{#each OPTIONS as opt, i}
				<button class="chip" class:on={selected.has(i)} onclick={() => toggle(i)}>
					<span class="box">{selected.has(i) ? '✓' : ''}</span>
					<span class="label" class:numeric={mode === 'fast'}>
						{mode === 'fast' ? i + 1 : opt}
					</span>
				</button>
			{/each}
		</div>

		<div class="actions">
			{#if mode === 'fast'}
				<button class="ghost" onclick={bail}> Sorry — I actually prefer normal </button>
			{/if}
			<button class="next" onclick={submit} disabled={committed}>
				{selected.size ? `Submit (${selected.size}) →` : 'Submit — none of these →'}
			</button>
		</div>
	{/if}
</div>

{#if import.meta.env.DEV}
	<aside class="debug">
		<p class="debug-title">🛠 debug · dev only</p>
		<label>
			Presentation
			<select bind:value={forced}>
				<option value="">↳ from Q29 answer ({patience.value ?? 'unset'})</option>
				<option value="fast">Fast (impatient, 1–2)</option>
				<option value="normal">Normal (3–5)</option>
				<option value="slow">Slow (patient, 6–7)</option>
			</select>
		</label>
	</aside>
{/if}

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.3;
	}
	.media > hr {
		margin: 0 0 1.75rem;
	}

	.gone {
		margin: 0 0 1.25rem;
		font-size: 1.05rem;
		font-style: italic;
		color: var(--muted);
	}
	.stream-label {
		text-align: center;
		font-size: 0.75rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0;
	}

	/* Slow mode: words are laid out from the start so nothing reflows as they
	   arrive — they simply fade in, one at a time. */
	.slow {
		min-height: 9rem;
	}
	.slow .w {
		opacity: 0;
		transition: opacity 0.6s ease;
	}
	.slow .w.shown {
		opacity: 1;
	}

	.choices {
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
		border-radius: 0.35rem;
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
	/* In fast mode the options were only ever spoken aloud, so to speak — all
	   you get here is the number. */
	.label.numeric {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-weight: 600;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
	}
	/* The lone escape hatch offered mid-reveal in slow mode. */
	.actions--solo {
		justify-content: flex-start;
		margin-top: 1.5rem;
		animation: rise 0.6s both;
	}
	.ghost,
	.next {
		padding: 0.75rem 1.5rem;
		font: inherit;
		font-weight: 600;
		border-radius: var(--radius);
		cursor: pointer;
		transition:
			background 0.15s ease,
			filter 0.12s ease;
	}
	.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--rule);
	}
	.ghost:hover {
		background: var(--accent-soft);
		color: inherit;
	}
	.next {
		margin-left: auto;
		background: var(--ink);
		color: var(--surface);
		border: none;
	}
	.next:hover:not(:disabled) {
		filter: brightness(1.15);
	}
	.next:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.debug {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 13rem;
		padding: 0.9rem;
		background: #ffffff;
		color: #111111;
		border: 1px solid #d4d4d4;
		border-radius: 0.6rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		font-family: system-ui, sans-serif;
		font-size: 0.8rem;
	}
	.debug-title {
		margin: 0;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #666;
	}
	.debug label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 600;
	}
	.debug select {
		font: inherit;
		font-weight: 400;
		padding: 0.35rem;
		border: 1px solid #ccc;
		border-radius: 0.4rem;
		background: #fff;
		color: #111;
	}
	@media (max-width: 480px) {
		.actions {
			flex-direction: column;
		}
		.next {
			margin-left: 0;
		}
	}
</style>
