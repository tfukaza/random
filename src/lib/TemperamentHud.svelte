<script>
	// The live temperament meter: the seven scoring axes as a compact strip of
	// read-only faders fixed to the bottom of the viewport while the quiz
	// runs. The quiz openly flaunting its dubious math in real time IS the
	// joke, so the panel plays it perfectly straight (design.md P6).
	//
	// Deliberately minimal chrome: no title, no verdict line, no curve — just
	// tracks, thumbs and a dotted zero line. Pole labels and the signed value
	// appear per-column on hover (mouse) or tap (touch).
	//
	// Motion comes from tweening the underlying numbers, never from CSS
	// transitions on thumb positions, so a future curve overlay could still be
	// added without desync (see Q46Equalizer for the original gotcha).
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { AXES, axisSummary } from '$lib/scoring.js';

	let { scores, onToggle = (/** @type {boolean} */ _open) => {} } = $props();

	const N = AXES.length;

	// Open by default on desktop; under 560px the panel presents as a bottom
	// sheet and starts closed behind the summon tab.
	let open = $state(true);
	if (typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches) {
		open = false;
	}
	// Reports both the initial state and every toggle, so the page can pad
	// its bottom for the open panel.
	$effect(() => {
		onToggle(open);
	});

	const axes = $derived(axisSummary(scores));

	// Normalization: everything renders as value/scale in [-1, 1]. The scale
	// re-checks the extremes on every answer (scores only change then) and
	// tweens, so a runaway axis compresses the whole field smoothly instead of
	// flying off the panel.
	const disp = tweened(AXES.map(() => 0), { duration: 550, easing: cubicOut });
	const scale = tweened(4, { duration: 550, easing: cubicOut });
	$effect(() => {
		const values = axes.map((a) => a.value);
		disp.set(values);
		scale.set(Math.max(4, ...values.map(Math.abs)));
	});

	/** column center, in % of panel width @param {number} i */
	const xAt = (i) => ((i + 0.5) * 100) / N;
	/** normalized [-1,1] → y in [100,0]; center zero at 50 @param {number} t */
	const yOf = (t) => ((1 - t) / 2) * 100;

	const ys = $derived($disp.map((v) => yOf(v / $scale)));

	// Which column's labels are revealed. Mouse: hover in/out. Touch: tap
	// toggles (tapping another column moves the reveal there).
	/** @type {number | null} */
	let active = $state(null);
	/** @param {number} i @param {PointerEvent} e */
	function enter(i, e) {
		if (e.pointerType === 'mouse') active = i;
	}
	/** @param {PointerEvent} e */
	function leave(e) {
		if (e.pointerType === 'mouse') active = null;
	}
	/** @param {number} i */
	function tap(i) {
		active = active === i ? null : i;
	}

	/** @param {number} v */
	const fmt = (v) => `${v > 0 ? '+' : ''}${v}`;
</script>

{#if open}
	<aside class="hud" aria-live="off">
		<button class="hud-close" aria-expanded="true" onclick={() => (open = false)} title="Hide the meter">−</button>

		<!-- Tiny pole emoji, top (+) and bottom (−): glanceable axis identity
		     without text. Grayscale so they read as print; the hovered/tapped
		     column's pair comes into color. -->
		<div class="emoji-row emoji-row--pos" aria-hidden="true">
			{#each axes as axis, i}
				<span class:lit={active === i}>{axis.posEmoji}</span>
			{/each}
		</div>

		<div class="stage">
			<svg class="viz" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
				<line class="zero" x1="0" y1="50" x2="100" y2="50" vector-effect="non-scaling-stroke" />
			</svg>
			<div class="cols">
				{#each axes as axis, i}
					<button
						class="col"
						aria-label="{axis.negLabel} to {axis.posLabel}: {fmt(axis.value)}"
						onpointerenter={(e) => enter(i, e)}
						onpointerleave={leave}
						onclick={() => tap(i)}
					>
						<span class="track"></span>
						<span class="thumb" class:lit={active === i} style="top: {ys[i]}%"></span>
					</button>
				{/each}
			</div>
		</div>

		<div class="emoji-row emoji-row--neg" aria-hidden="true">
			{#each axes as axis, i}
				<span class:lit={active === i}>{axis.negEmoji}</span>
			{/each}
		</div>

		<!-- One centralized readout for whichever axis is hovered/tapped; the
		     reserved line keeps the panel height steady. -->
		<div class="readout" aria-hidden="true">
			{#if active !== null}
				<span class="ro-pole" class:won={axes[active].value < 0}>{axes[active].negLabel}</span>
				<span class="ro-dash">—</span>
				<span class="ro-pole" class:won={axes[active].value >= 0}>{axes[active].posLabel}</span>
				<span class="ro-val">{fmt(axes[active].value)}</span>
			{:else}
				&nbsp;
			{/if}
		</div>
	</aside>
{:else}
	<button class="hud-pill" aria-expanded="false" onclick={() => (open = true)}>
		<span aria-hidden="true">▴</span>
		<span class="sr-only">Show the temperament meter</span>
	</button>
{/if}

<style>
	.hud {
		position: fixed;
		left: 50%;
		bottom: 0.75rem;
		transform: translateX(-50%);
		z-index: 60;
		width: min(19rem, calc(100vw - 1.5rem));
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 0.75rem 0.9rem 0.55rem;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.07),
			0 6px 18px rgba(0, 0, 0, 0.09);
		animation: hud-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes hud-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(1.25rem);
		}
	}

	.hud-close {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		z-index: 2;
		width: 1.15rem;
		height: 1.15rem;
		display: none;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font: inherit;
		font-size: 0.8rem;
		line-height: 1;
		color: var(--muted);
		cursor: pointer;
		transition:
			color 0.12s ease,
			border-color 0.12s ease;
	}
	.hud-close:hover {
		color: var(--ink);
		border-color: var(--ink);
	}

	/* The meter. No overflow:hidden (thumbs may sit at the extremes); no gap
	   (columns must be exactly 1/N wide); no transition on thumb top. */
	.stage {
		position: relative;
		height: clamp(4.25rem, 12vw, 5.25rem);
	}
	.viz {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.zero {
		stroke: var(--rule);
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-dasharray: 0 5;
	}
	.cols {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		height: 100%;
	}
	.col {
		position: relative;
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		font: inherit;
		cursor: default;
		-webkit-tap-highlight-color: transparent;
	}
	.col:focus {
		outline: none;
	}
	.col:focus-visible .thumb {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.track {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		transform: translateX(-50%);
		background: var(--border);
	}
	.thumb {
		position: absolute;
		left: 50%;
		width: 9px;
		height: 9px;
		transform: translate(-50%, -50%);
		background: var(--ink);
		border: 2px solid var(--surface);
		border-radius: 50%;
		box-sizing: content-box;
	}
	.thumb.lit {
		transform: translate(-50%, -50%) scale(1.2);
	}

	/* Pole emoji rows: printed in grayscale until their column is examined. */
	.emoji-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 0.62rem;
		line-height: 1;
	}
	.emoji-row span {
		filter: grayscale(1);
		opacity: 0.55;
		transition:
			filter 0.15s ease,
			opacity 0.15s ease;
	}
	.emoji-row span.lit {
		filter: none;
		opacity: 1;
	}
	.emoji-row--pos {
		margin-bottom: 0.3rem;
	}
	.emoji-row--neg {
		margin-top: 0.3rem;
	}

	/* The centralized readout for the hovered/tapped axis. */
	.readout {
		margin-top: 0.45rem;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		font-size: 0.55rem;
		line-height: 1;
		color: var(--muted);
		white-space: nowrap;
	}
	.ro-pole.won {
		color: var(--ink);
		font-weight: 600;
	}
	.ro-dash {
		margin: 0 0.25rem;
		color: var(--rule);
	}
	.ro-val {
		margin-left: 0.5rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}

	/* The collapsed summon tab. */
	.hud-pill {
		position: fixed;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
		z-index: 60;
		padding: 0.25rem 1.4rem 0.3rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: var(--radius);
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.07);
		font: inherit;
		font-size: 0.7rem;
		color: var(--muted);
		cursor: pointer;
		transition: color 0.12s ease;
	}
	.hud-pill:hover {
		color: var(--ink);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (max-width: 560px) {
		/* Desktop stays permanently open; only the mobile bottom sheet can collapse. */
		.hud-close {
			display: flex;
		}
		/* Bottom sheet: full-width, flush to the bottom edge. */
		.hud {
			width: 100vw;
			left: 0;
			bottom: 0;
			transform: none;
			border-left: none;
			border-right: none;
			border-bottom: none;
			padding-bottom: max(0.55rem, env(safe-area-inset-bottom));
		}
		@keyframes hud-in {
			from {
				opacity: 0;
				transform: translateY(100%);
			}
		}
		.stage {
			height: clamp(3.75rem, 18vw, 4.75rem);
			/* The sheet spans the viewport, but the faders stay huddled. */
			max-width: 18rem;
			margin: 0 auto;
		}
		.readout {
			font-size: 0.5rem;
		}
	}
</style>
