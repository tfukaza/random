<script>
	// Wraps a whole question and changes how it *arrives*, based on the patience
	// claimed in Q29. Applied by the orchestrator to every question in the band
	// after Q29 up to the next interlude.
	//
	// The hard constraint: this thing cannot know what question it's wrapping.
	// There's no shared text or option schema — questions are arbitrary
	// components. So both modes work without reading a single word:
	//
	//   fast (claimed impatient) → the whole question — premise, prompt and every
	//     option — is collapsed into one sentence and fired past at 500 wpm, and
	//     then all you get is a box to type one number into. You said you hated
	//     waiting, so nothing waits for you.
	//   slow (claimed patient)   → every element still animates in exactly as it
	//     normally would — words, rules, cards, sliders, the № marker — just
	//     twenty times slower, and nothing can be touched until it has finished
	//     arriving.
	//
	// Both offer the same escape hatch, and taking it ends the bit for the rest
	// of the band (see `bailOut` in patienceState).
	//
	// HOW SLOW MODE WORKS. Every pre-answer animation in this app is CSS, so
	// there is no need to touch a single question: `getAnimations({subtree})`
	// hands back every running CSS animation AND transition in the subtree, and
	// each one's `playbackRate` scales its whole timing — delays and staggers
	// included — so the reveal stretches proportionally rather than being masked.
	//
	// Deliberately NOT covered: JS-driven timing (`tweened`, `setTimeout`). In
	// this band every such timer fires only *after* an answer is given (Q22's
	// reveal, PickList's ripple, Q52's commit), and once you have answered the
	// patience test is over — so leaving those at full speed is correct.
	//
	// HOW FAST MODE WORKS. The question is rendered exactly once and *stowed* —
	// still in the DOM at full width, just invisible and untouchable — so it can
	// be read out of the DOM and, when the taker types a number, driven through
	// its OWN controls. That is what keeps every question's per-option scoring,
	// ledger writes and cross-checks working exactly as they do unlensed; the
	// lens never invents a score. See patience/questionAdapters.js.
	//
	// It is rendered in ONE place and toggled with a class, never moved between
	// branches: moving it would remount the question component, throwing away
	// both the host we read and the state we are about to drive.
	import { patience, bailOut } from '$lib/questions/patienceState.svelte.js';
	import { readQuestion } from '$lib/patience/questionAdapters.js';
	import SpeedRead from '$lib/SpeedRead.svelte';
	import { cascade } from '$lib/reveal.js';

	/** @type {{ mode: 'fast' | 'normal' | 'slow', debug?: boolean, children: import('svelte').Snippet }} */
	let { mode, debug = false, children } = $props();

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
	// Shape mirrored from questionAdapters.js — a cross-file JSDoc type import
	// doesn't resolve here, and without a resolvable annotation `adapter` narrows
	// to `never` and every use of it errors.
	/** @typedef {{ w: string, hold?: number, tone?: 'num' | 'body' | 'chunk' }} Token */
	/** @typedef {{ kind: 'cards' | 'slider' | 'integer', tokens: Token[], sentence: string,
	 *   hint: string, parse: (raw: string) => number | null,
	 *   validate: (n: number) => boolean, answer: (n: number) => Promise<boolean> }} Adapter */
	let adapter = $state(/** @type {Adapter | null} */ (null));
	// True once the question has been un-stowed: either we could not read/drive
	// it (fail open — never strand someone in front of a box that can't commit),
	// or they have answered and should see the question's own reveal.
	let escaped = $state(false);
	let read = $state(false);
	let typed = $state('');
	let submitted = $state(false);
	let outOfRange = $state(false);

	const parsed = $derived(adapter ? adapter.parse(typed) : null);
	const valid = $derived(parsed !== null && !!adapter?.validate(parsed));

	// Chrome timing, per reveal.js: the reader may not start until the lead-in
	// has finished, and the entry box waits on the read, not on a timer.
	const seq = $derived.by(() => {
		const c = cascade();
		return { lead: c.text(LEAD), rule: c.rule(), reader: c.done() };
	});

	async function submit() {
		if (!adapter || submitted || !valid || parsed === null) return;
		submitted = true;
		const ok = await adapter.answer(parsed);
		// Either way the question comes back: on success so its own reveal plays
		// (Q22's tangent lines take 2.6s and are its entire payoff), on failure so
		// it can still be answered by hand. Its controls are already disabled
		// after a successful drive, so there is no second look in substance.
		escaped = true;
		if (!ok) submitted = false;
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
		elapsed = 0;
		arrived = m !== 'slow';
		liveRate = m === 'slow' ? SLOW_RATE : 1;

		if (m === 'fast') {
			// Read the question out of the DOM. Everything we need is present at
			// first render (only animation-delay is staggered), but retry a few
			// frames for any future question that builds content asynchronously —
			// then fail open rather than block.
			let tries = 0;
			let raf = 0;
			const attempt = () => {
				if (!host) return;
				const a = readQuestion(host);
				if (a) {
					adapter = a;
					return;
				}
				if (++tries > 8) {
					escaped = true;
					return;
				}
				raf = requestAnimationFrame(attempt);
			};
			raf = requestAnimationFrame(attempt);
			return () => cancelAnimationFrame(raf);
		}

		if (m !== 'slow') return;

		// Without the Web Animations API there is nothing to slow, and holding
		// interaction would strand the taker on a question they can never
		// answer. Fail open: deliver it normally.
		if (!host || typeof host.getAnimations !== 'function') {
			arrived = true;
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
		};
	});

	// Don't offer the way out instantly — let the bit land first.
	const offerBail = $derived(
		mode === 'fast' ? read && !submitted && !escaped : elapsed >= 2000 && !arrived
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
			<!-- Rendered once and only once. `escaped` un-stows it in place; moving
			     it to another branch would remount the question and destroy both the
			     host we read and the controls we drive. -->
			<div class="stow" class:stow--open={escaped} inert={!escaped} bind:this={host}>
				{@render children()}
			</div>
		{/if}

		{#if mode === 'fast' && !escaped}
			<div class="rsvp">
				<p class="lead" style="animation-delay: {seq.lead}ms">{LEAD}</p>
				<hr class="rule" style="animation-delay: {seq.rule}ms" />

				{#if adapter}
					{#if !read}
						<SpeedRead
							tokens={adapter.tokens}
							sentence={adapter.sentence}
							wpm={WPM}
							delay={seq.reader}
							onDone={() => (read = true)}
						/>
					{:else}
						<p class="gone">That was the question, and those were the options.</p>
						<div class="entry">
							<label class="field">
								<span class="field-label">Your answer</span>
								<input
									type="text"
									inputmode="numeric"
									enterkeyhint="go"
									autocomplete="off"
									spellcheck="false"
									placeholder="—"
									bind:value={typed}
									disabled={submitted}
									oninput={() => (outOfRange = false)}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											if (valid) submit();
											else outOfRange = parsed !== null;
										}
									}}
								/>
							</label>
							<p class="hint">
								{outOfRange ? adapter.hint + '.' : adapter.hint}
							</p>
						</div>
						<div class="actions">
							<button class="next" onclick={submit} disabled={!valid || submitted}>
								{submitted ? 'Recorded.' : 'Submit →'}
							</button>
						</div>
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
				<option value="fast">Fast (impatient, 1–2)</option>
				<option value="normal">Normal (3–5)</option>
				<option value="slow">Slow (patient, 6–7)</option>
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
	}
	/* Stowed: still laid out at full width — so SVG viewBoxes, ResizeObservers
	   and getBoundingClientRect all still see real geometry, which display:none
	   would destroy — but invisible and inert. `pointer-events: none` blocks a
	   real click; el.click() still dispatches, which is how we drive it. */
	.stow {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		opacity: 0;
		pointer-events: none;
	}
	.stow--open {
		position: static;
		width: auto;
		opacity: 1;
		pointer-events: auto;
	}

	.rsvp {
		position: relative;
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
	.entry {
		margin-bottom: 1.5rem;
		animation: rise 0.42s 0.1s both;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.field-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	.entry input {
		width: 100%;
		padding: 0.85rem 1rem;
		font: inherit;
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
	.entry input:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.hint {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		animation: rise 0.42s 0.18s both;
	}
	.next {
		padding: 0.75rem 1.5rem;
		font: inherit;
		font-weight: 600;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
	}
	.next:disabled {
		opacity: 0.45;
		cursor: default;
	}
	/* Slow: nothing is hidden or masked — the question simply arrives at 1/20th
	   speed. Pointer events stay off until it finishes, because elements fading
	   in from opacity 0 are otherwise invisible but still clickable, and the
	   whole point is that it genuinely cannot be answered early. */
	.governed.held {
		pointer-events: none;
	}
	.hatch {
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
