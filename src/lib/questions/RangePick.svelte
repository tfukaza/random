<script>
	// Shared dual-thumb range picker. Uses explicit pointer handling rather than
	// two overlaid native <input type=range>: with native inputs the thumbs
	// overlap once they collide and the one on top steals the drag, so the
	// handles appear to swap. Here the grabbed thumb is tracked for the whole
	// gesture, so low can never pass high (or vice versa).
	//
	// Only the two selected labels are shown (on the thumbs) plus the endpoints —
	// listing every label would be unreadable on mobile for long sets.
	import SplitText from '$lib/SplitText.svelte';

	let {
		prompt,
		labels,
		startLow = 0,
		startHigh,
		/** Largest selectable span. Defaults to "everything"; pass labels.length-1
		 *  to forbid selecting the entire set (i.e. require a proper subset). */
		maxSpan,
		/** Smallest selectable span. Pass 2+ to stop the thumbs landing on the
		 *  same label (i.e. forbid a one-item "range" like L–L). */
		minSpan = 1,
		/** Alphabet mode: strip any letter outside the selected range from the
		 *  prompt and the Next button, so the UI visibly decays as you narrow it. */
		redact = false,
		toScore,
		onAnswer
	} = $props();

	// Props are static per question, so seeding state from them once is intended.
	// svelte-ignore state_referenced_locally
	const last = labels.length - 1;
	// svelte-ignore state_referenced_locally
	const cap = maxSpan ?? labels.length;
	// svelte-ignore state_referenced_locally
	let low = $state(startLow);
	// svelte-ignore state_referenced_locally
	let high = $state(startHigh ?? last);

	/** @type {'low' | 'high' | null} */
	let dragging = $state(null);
	/** @type {HTMLElement | null} */
	let trackEl = $state(null);

	const pct = (/** @type {number} */ i) => (i / last) * 100;
	const count = $derived(high - low + 1);

	// Drop every letter outside the chosen span; punctuation and spaces survive,
	// so the sentence erodes in place rather than reflowing away.
	/** @param {string} text */
	function strip(text) {
		return text.replace(/[a-z]/gi, (ch) => {
			const idx = ch.toUpperCase().charCodeAt(0) - 65;
			return idx >= low && idx <= high ? ch : '';
		});
	}
	const shownPrompt = $derived(redact ? strip(prompt) : prompt);
	const shownNext = $derived(redact ? strip('Next') : 'Next');

	// Each setter clamps against the other thumb (keeping at least `minSpan`
	// between them) and against the `cap`, so the handles can neither cross,
	// collide, nor stretch to cover the whole set.
	/** @param {number} v */
	function setLow(v) {
		let n = Math.max(0, Math.min(v, high - minSpan + 1));
		if (high - n + 1 > cap) n = high - cap + 1;
		low = n;
	}
	/** @param {number} v */
	function setHigh(v) {
		let n = Math.min(last, Math.max(v, low + minSpan - 1));
		if (n - low + 1 > cap) n = low + cap - 1;
		high = n;
	}

	/** @param {number} clientX */
	function indexAt(clientX) {
		if (!trackEl) return 0;
		const rect = trackEl.getBoundingClientRect();
		const t = (clientX - rect.left) / rect.width;
		return Math.round(Math.max(0, Math.min(1, t)) * last);
	}

	/** @param {'low' | 'high'} which @param {PointerEvent} e */
	function grab(which, e) {
		dragging = which;
		/** @type {HTMLElement} */ (e.currentTarget).setPointerCapture?.(e.pointerId);
		e.preventDefault();
	}

	/** @param {PointerEvent} e */
	function move(e) {
		if (!dragging) return;
		const i = indexAt(e.clientX);
		if (dragging === 'low') setLow(i);
		else setHigh(i);
	}

	function release() {
		dragging = null;
	}

	// Clicking the bare track nudges whichever thumb is closer.
	/** @param {PointerEvent} e */
	function trackDown(e) {
		const i = indexAt(e.clientX);
		const which = Math.abs(i - low) <= Math.abs(i - high) ? 'low' : 'high';
		dragging = which;
		if (which === 'low') setLow(i);
		else setHigh(i);
	}

	/** @param {'low' | 'high'} which @param {KeyboardEvent} e */
	function key(which, e) {
		const delta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
		if (!delta) return;
		e.preventDefault();
		if (which === 'low') setLow(low + delta);
		else setHigh(high + delta);
	}

	function commit() {
		onAnswer(toScore(low, high));
	}
</script>

<svelte:window onpointermove={move} onpointerup={release} onpointercancel={release} />

<div class="range-pick">
	{#if redact}
		<!-- Plain text while redacting: SplitText would re-run its per-letter
		     entrance animation on every slider move. -->
		<h2 class="redacted">{shownPrompt}</h2>
	{:else}
		<h2><SplitText text={prompt} stagger={14} /></h2>
	{/if}
	<hr class="rule" />

	<div class="ends">
		<span>{labels[0]}</span>
		<span>{labels[last]}</span>
	</div>

	<div class="dual">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="track" bind:this={trackEl} onpointerdown={trackDown}>
			<div class="fill" style="left: {pct(low)}%; width: {pct(high) - pct(low)}%"></div>
		</div>

		<div
			class="thumb"
			class:active={dragging === 'low'}
			style="left: {pct(low)}%"
			role="slider"
			tabindex="0"
			aria-label="Range start"
			aria-valuemin={0}
			aria-valuemax={last}
			aria-valuenow={low}
			aria-valuetext={labels[low]}
			onpointerdown={(e) => grab('low', e)}
			onkeydown={(e) => key('low', e)}
		>
			<span class="bubble">{labels[low]}</span>
		</div>

		<div
			class="thumb"
			class:active={dragging === 'high'}
			style="left: {pct(high)}%"
			role="slider"
			tabindex="0"
			aria-label="Range end"
			aria-valuemin={0}
			aria-valuemax={last}
			aria-valuenow={high}
			aria-valuetext={labels[high]}
			onpointerdown={(e) => grab('high', e)}
			onkeydown={(e) => key('high', e)}
		>
			<span class="bubble">{labels[high]}</span>
		</div>
	</div>

	<p class="readout">
		<strong>{labels[low]} – {labels[high]}</strong>
		<span class="count">({count} of {labels.length})</span>
	</p>

	<button class="next" onclick={commit}>{shownNext} →</button>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	/* Hold a stable height so the card doesn't jump as letters vanish. */
	.redacted {
		min-height: 4.6rem;
	}
	.range-pick > hr {
		margin: 0 0 1.75rem;
	}
	.ends {
		display: flex;
		justify-content: space-between;
		font-weight: 700;
		color: var(--muted);
		margin-bottom: 0.5rem;
	}

	.dual {
		position: relative;
		height: 2.75rem;
		touch-action: none;
	}
	.track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 0.4rem;
		transform: translateY(-50%);
		background: var(--border);
		border-radius: 999px;
		cursor: pointer;
	}
	.fill {
		position: absolute;
		top: 0;
		bottom: 0;
		background: var(--ink);
		border-radius: 999px;
	}
	.thumb {
		position: absolute;
		top: 50%;
		width: 1.3rem;
		height: 1.3rem;
		margin: -0.65rem 0 0 -0.65rem;
		border-radius: 50%;
		background: var(--ink);
		border: 2px solid var(--surface);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
		cursor: grab;
		touch-action: none;
	}
	.thumb.active {
		cursor: grabbing;
		transform: scale(1.15);
	}
	.thumb:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}
	.bubble {
		position: absolute;
		bottom: 1.35rem;
		left: 50%;
		transform: translateX(-50%);
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--ink);
		pointer-events: none;
	}

	.readout {
		text-align: center;
		margin: 1.25rem 0 2rem;
		font-size: 1.05rem;
	}
	.readout .count {
		color: var(--muted);
		margin-left: 0.35rem;
	}
	.next {
		display: block;
		margin-left: auto;
		padding: 0.75rem 1.5rem;
		background: var(--ink);
		color: var(--surface);
		border: none;
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.12s ease;
	}
	.next:hover {
		filter: brightness(1.08);
	}
</style>
