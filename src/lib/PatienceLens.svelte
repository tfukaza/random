<script>
	// Wraps a whole question and changes how it *arrives*, based on the patience
	// claimed in Q29. Applied by the orchestrator to every question in the chapter
	// after Q29 up to the next interlude.
	//
	// Questions remain arbitrary components, but shared answer controls expose
	// stable reader labels in their rendered markup:
	//
	//   fast (claimed impatient) → premise, prompt and every option are fired past
	//     at high speed; the original visuals and answer controls remain visible
	//     and unlock only when the reader finishes.
	//   slow (claimed patient)   → every element still animates in exactly as it
	//     normally would — words, rules, cards, sliders, the № marker — just
	//     twenty times slower, and nothing can be touched until it has finished
	//     arriving.
	//
	// Both offer the same escape hatch, and taking it ends the bit for the rest
	// of the chapter (see `bailOut` in patienceState).
	//
	// HOW SLOW MODE WORKS. Every pre-answer animation in this app is CSS, so
	// there is no need to touch a single question: `getAnimations({subtree})`
	// hands back every running CSS animation AND transition in the subtree, and
	// each one's `playbackRate` scales its whole timing — delays and staggers
	// included — so the reveal stretches proportionally rather than being masked.
	//
	// Deliberately NOT covered: JS-driven timing (`tweened`, `setTimeout`). In
	// this chapter every such timer fires only *after* an answer is given (Q22's
	// reveal, PickList's ripple, Q52's commit), and once you have answered the
	// patience test is over — so leaving those at full speed is correct.
	//
	// HOW FAST MODE WORKS. The question is rendered exactly once. Its authored
	// text is hidden while the reader presents that text; its real visuals and
	// controls never move or remount. See patience/questionAdapters.js.
	//
	// It is rendered in ONE place and toggled with a class, never moved between
	// branches: moving it would remount the question component, throwing away
	// both the host we read and the state we are about to drive.
	import { patience, bailOut } from '$lib/questions/patienceState.svelte.js';
	import { clearPresentationOptions, readPresentation } from '$lib/patience/questionAdapters.js';
	import SpeedRead from '$lib/SpeedRead.svelte';
	import { cascade } from '$lib/reveal.js';
	import { markReady, recordEvent, setInteractionLocked } from '$lib/questions/metrics.svelte.js';

	/** @type {{ mode: 'fast' | 'normal' | 'slow', debug?: boolean, allowEscape?: boolean, children: import('svelte').Snippet }} */
	let { mode, debug = false, allowEscape = true, children } = $props();

	// 1500 wpm — 40ms a word. Well past the point of comfortable reading, which
	// is the point: you rated yourself maximally impatient.
	const WPM = 1500;
	const LEAD = 'Read carefully.';
	// 1/20th speed. A question that normally finishes arriving in ~1.25s now
	// takes ~25 seconds.
	const SLOW_RATE = 0.05;
	// How often to re-grip animations that began after mount, and to test
	// whether everything has finished.
	const POLL_MS = 200;
	// However pathological the content, release interaction eventually.
	const CEILING_MS = 90000;

	let arrived = $state(false);
	let elapsed = $state(0);
	/** @type {HTMLElement | undefined} */
	let host = $state();

	/* ------------------------------------------------------------ fast mode */
	/** @typedef {{ w: string, hold?: number, tone?: 'num' | 'body' | 'chunk' }} Token */
	/** @typedef {{ tokens: Token[], sentence: string }} Presentation */
	let presentation = $state(/** @type {Presentation | null} */ (null));
	let read = $state(false);

	// Chrome timing, per reveal.js: the reader may not start until the lead-in
	// has finished, and the entry box waits on the read, not on a timer.
	const seq = $derived.by(() => {
		const c = cascade();
		return { lead: c.text(LEAD), rule: c.rule(), reader: c.done() };
	});

	function completeFast() {
		if (read) return;
		read = true;
		setInteractionLocked(false);
		markReady('fast-reader');
		recordEvent('reader-completed');
	}

	// Dev-panel readout only — the governor itself never reads these.
	let liveRate = $state(1);
	let running = $state(0);

	/** Animations that loop forever must never gate arrival. */
	const finite = (/** @type {Animation} */ a) =>
		a.effect?.getComputedTiming?.().iterations !== Infinity;

	/** @param {number} rate */
	function grip(rate) {
		if (!host) return [];
		const all = host.getAnimations({ subtree: true });
		for (const a of all) if (a.playbackRate !== rate) a.playbackRate = rate;
		return all;
	}

	// Restart the presentation whenever the mode changes. The orchestrator keys
	// each question on its flow index, so a new question remounts this anyway —
	// this covers a mode change mid-question (i.e. bailing out).
	$effect(() => {
		const m = mode;
		setInteractionLocked(m !== 'normal');
		elapsed = 0;
		arrived = m !== 'slow';
		liveRate = m === 'slow' ? SLOW_RATE : 1;

		if (m === 'fast') {
			read = false;
			presentation = null;
			recordEvent('reader-started');
			// Read the question out of the DOM. Everything we need is present at
			// first render (only animation-delay is staggered), but retry a few
			// frames for any future question that builds content asynchronously —
			// then fail open rather than block.
			let tries = 0;
			let raf = 0;
			const attempt = () => {
				if (!host) return;
				const a = readPresentation(host);
				if (a) {
					presentation = a;
					return;
				}
				if (++tries > 8) {
					completeFast();
					return;
				}
				raf = requestAnimationFrame(attempt);
			};
			raf = requestAnimationFrame(attempt);
			return () => {
				cancelAnimationFrame(raf);
				if (host) clearPresentationOptions(host);
				setInteractionLocked(false);
			};
		}

		if (m !== 'slow') return;

		// Without the Web Animations API there is nothing to slow, and holding
		// interaction would strand the taker on a question they can never
		// answer. Fail open: deliver it normally.
			if (!host || typeof host.getAnimations !== 'function') {
				arrived = true;
				setInteractionLocked(false);
				markReady('slow-fallback');
			return;
		}

		let cancelled = false;
		let clearPolls = 0;
		let ms = 0;
		/** @type {Animation[]} */
		let touched = [];

		// Grip as early as possible: a CSS animation is returned by
		// getAnimations() *during its delay phase*, so catching it now scales the
		// delay too. Waiting for `animationstart` would leave every stagger delay
		// running at full speed and only stretch the durations.
		const apply = () => {
			if (cancelled) return;
			touched = grip(SLOW_RATE);
			running = touched.filter((a) => a.playState === 'running' && finite(a)).length;
		};
		// Once now (effects run after the DOM update but before paint) and again
		// next frame, so nothing gets a head start at full speed.
		apply();
		const raf = requestAnimationFrame(apply);

		// Animations created later (transitions, late-mounting children).
		host?.addEventListener('animationstart', apply, true);
		host?.addEventListener('transitionrun', apply, true);

		const iv = setInterval(() => {
			if (cancelled) return;
			apply();
			ms += POLL_MS;
			elapsed = ms;
			// Staggered reveals leave brief gaps where nothing is mid-flight, so
			// require two consecutive quiet polls before calling it arrived.
			clearPolls = running === 0 ? clearPolls + 1 : 0;
				if (clearPolls >= 2 || ms >= CEILING_MS) {
					arrived = true;
					setInteractionLocked(false);
					markReady('slow-arrived');
				clearInterval(iv);
			}
		}, POLL_MS);

			return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			clearInterval(iv);
			host?.removeEventListener('animationstart', apply, true);
			host?.removeEventListener('transitionrun', apply, true);
			// Bailing out or advancing must not leave anything crawling.
				for (const a of touched) a.playbackRate = 1;
				setInteractionLocked(false);
			};
	});

	// Don't offer the way out instantly — let the bit land first.
	const offerBail = $derived(
		allowEscape && (mode === 'fast' ? read : elapsed >= 2000 && !arrived)
	);
</script>

{#if mode === 'normal'}
	<!-- Render bare, so an unlensed question's DOM is byte-identical to what it
	     would be without this component in the tree. -->
	{@render children()}
{:else}
	<div class="lens">
		{#if mode === 'slow'}
			<div class="governed" class:held={!arrived} bind:this={host}>
				{@render children()}
			</div>
		{:else}
			<div class="fast-content" class:reading={!read} inert={!read} bind:this={host}>
				{@render children()}
			</div>
		{/if}

		{#if mode === 'fast'}
			<div class="rsvp">
				<p class="lead" style="animation-delay: {seq.lead}ms">{LEAD}</p>
				<hr class="rule" style="animation-delay: {seq.rule}ms" />

				{#if presentation}
					{#if !read}
						<SpeedRead
							tokens={presentation.tokens}
							sentence={presentation.sentence}
							wpm={WPM}
							delay={seq.reader}
							onDone={completeFast}
						/>
					{:else}
						<p class="gone">The question is ready.</p>
					{/if}
				{/if}
			</div>
		{/if}

		{#if offerBail}
			<div class="hatch">
				<button class="ghost" onclick={bailOut}>Sorry — I actually prefer normal</button>
			</div>
		{/if}
	</div>
{/if}

{#if import.meta.env.DEV && debug}
	<aside class="debug">
		<p class="debug-title">🛠 patience lens · dev only</p>
		<label>
			Presentation
			<select bind:value={patience.debugForce}>
				<option value="">↳ from Q29 answer ({patience.value ?? 'unset'})</option>
				<option value="fast">Fast (impatient, 1)</option>
				<option value="normal">Normal (2–6)</option>
				<option value="slow">Slow (patient, 7)</option>
			</select>
		</label>
		<p class="debug-note">bailed: {patience.bailed}</p>
		{#if mode === 'slow'}
			<p class="debug-note">rate ×{liveRate} · animating {running}</p>
			<p class="debug-note">
				{arrived ? 'arrived — interactive' : `held ${(elapsed / 1000).toFixed(1)}s`}
			</p>
		{/if}
	</aside>
{/if}

<style>
	.lens {
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.fast-content {
		order: 1;
		width: 100%;
	}
	/* Authored prose is delivered by the reader. Keep its layout box so figures
	   and controls do not jump, while leaving the actual controls fully visible. */
	.fast-content :global(span.split),
	.fast-content :global([data-reader-text]),
	.fast-content :global(.premise),
	.fast-content :global(.statement),
	.fast-content :global(.hint),
	.fast-content :global(h1),
	.fast-content :global(h2) {
		visibility: hidden;
	}
	.fast-content :global([data-reader-option]) {
		position: relative;
	}
	.fast-content :global([data-reader-label]) {
		visibility: hidden !important;
	}
	.fast-content :global([data-reader-option]::after) {
		content: attr(data-reader-number);
		position: absolute;
		z-index: 8;
		top: 50%;
		left: 50%;
		display: grid;
		place-items: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.25rem;
		transform: translate(-50%, -50%);
		box-sizing: border-box;
		border: 1px solid var(--ink);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		font-family: inherit;
		font-size: 0.9rem;
		font-style: normal;
		font-weight: 700;
		line-height: 1;
		pointer-events: none;
	}

	.rsvp {
		position: relative;
		order: 0;
	}
	.lead {
		margin: 0 0 1.25rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--muted);
		animation: rise 0.42s both;
	}
	.rsvp > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.4s both;
	}
	.gone {
		margin: 0 0 1.5rem;
		font-size: 1.05rem;
		font-style: italic;
		color: var(--muted);
		animation: rise 0.42s both;
	}
	/* Slow: nothing is hidden or masked — the question simply arrives at 1/20th
	   speed. Pointer events stay off until it finishes, because elements fading
	   in from opacity 0 are otherwise invisible but still clickable, and the
	   whole point is that it genuinely cannot be answered early. */
	.governed.held {
		pointer-events: none;
	}
	.hatch {
		order: 2;
		margin-top: 1.5rem;
		animation: rise 0.6s both;
	}
	.ghost {
		padding: 0.75rem 1.5rem;
		font: inherit;
		font-weight: 600;
		border-radius: var(--radius);
		cursor: pointer;
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--rule);
		transition: background 0.15s ease;
	}
	.ghost:hover {
		background: var(--accent-soft);
		color: inherit;
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
	.debug-note {
		margin: 0;
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
</style>
