<script>
	// Q46 — an equalizer panel, the kind that ships in every headphone app. Six
	// vertical faders, and one continuous curve drawn through wherever you put
	// them. Standalone preference question: no lore, no premise (docs/lore.md).
	//
	// THE ALIGNMENT TRICK: the SVG overlay, the fader columns and the pointer math
	// all measure the SAME element (`.stage`). The overlay is viewBox 0 0 100 100
	// with preserveAspectRatio="none", so one number — `yOf(db)` — is used both as
	// the thumb's CSS `top: %` and as the curve's SVG `y`. They cannot drift apart
	// at any container width, which is the failure mode a fixed-ratio viewBox has.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { audio, playSfx } from '$lib/audio/audio.svelte.js';
	import { MUSIC_EQ_BANDS, MUSIC_EQ_LIMIT_DB } from '$lib/audio/web-audio-transport.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	let { onAnswer } = $props();

	const seq = (() => {
		const c = cascade();
		c.text('What\u2019s your ideal audio configuration?');
		return { rule: c.rule(), panel: c.block(), next: c.action() };
	})();

	const MIN_DB = -MUSIC_EQ_LIMIT_DB;
	const MAX_DB = MUSIC_EQ_LIMIT_DB;
	const STEP = 0.5;

	// Named by what they sound like, not by frequency — the taker is picking a
	// vibe, not tuning a mixing desk. The list comes from the audio engine so a
	// fader is always wired to the filter beside it: six labels and six nodes
	// drifting out of order is the one failure this question cannot show you.
	const BANDS = MUSIC_EQ_BANDS;
	const N = BANDS.length;

	/** @type {number[]} */
	let gains = $state(BANDS.map(() => 0));
	/** @type {number | null} */
	let dragging = $state(null);
	let committed = $state(false);
	let lastDetent = 0;
	/** @type {HTMLElement} */
	let stageEl;

	// Band centre in viewBox units — identical to the grid cell's CSS `left: 50%`
	// because the columns are `repeat(N, 1fr)` with no gap.
	/** @param {number} i */
	const xAt = (i) => ((i + 0.5) * 100) / N;
	// The one number shared by the thumb's `top: %` and the curve's `y`.
	/** @param {number} db */
	const yOf = (db) => ((MAX_DB - db) / (MAX_DB - MIN_DB)) * 100;

	/** @param {number} db */
	const fmt = (db) => `${db > 0 ? '+' : ''}${db.toFixed(1)}`;

	const pts = $derived(gains.map((db, i) => ({ x: xAt(i), y: yOf(db) })));

	/**
	 * Cubic Bézier between each pair of dots with **horizontal control handles**:
	 * each segment's first control point shares its start dot's y, and the second
	 * shares its end dot's y. So the curve is perfectly flat as it leaves and as
	 * it arrives at every dot — it never tilts through one.
	 *
	 * Three things fall out of that, all of them wanted:
	 *   - two dots at the same height give a dead-flat line between them, because
	 *     all four control y values are equal;
	 *   - the curve can never overshoot a dot — a Bézier stays within its control
	 *     points' convex hull, and here that hull's y range is exactly the two
	 *     dots' y range. No limiter needed;
	 *   - each segment is a symmetric ease-in-out S, which is the smooth shape.
	 *
	 * Handles sit at h/2, so they meet at the segment's midpoint — the flattest
	 * approach into each dot that still resolves in one segment.
	 * @param {{x: number, y: number}[]} p
	 */
	function smoothSegments(p) {
		const n = p.length;
		if (n < 2) return '';
		const h = p[1].x - p[0].x; // uniform spacing

		let out = '';
		for (let i = 0; i < n - 1; i++) {
			const a = p[i];
			const b = p[i + 1];
			out += ` C ${a.x + h / 2} ${a.y}, ${b.x - h / 2} ${b.y}, ${b.x} ${b.y}`;
		}
		return out;
	}

	// Flat-extend to both edges so it reads as one line crossing the panel rather
	// than a curve floating in the middle.
	const curveD = $derived(
		`M 0 ${pts[0].y} L ${pts[0].x} ${pts[0].y}${smoothSegments(pts)} L 100 ${pts[N - 1].y}`
	);
	const areaD = $derived(`${curveD} L 100 100 L 0 100 Z`);

	/** @param {number} clientY */
	function gainAt(clientY) {
		const rect = stageEl.getBoundingClientRect();
		const t = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		const raw = MAX_DB - t * (MAX_DB - MIN_DB);
		return Math.round(raw / STEP) * STEP;
	}

	/** @param {number} i @param {number} db */
	function set(i, db) {
		const next = Math.max(MIN_DB, Math.min(MAX_DB, db));
		if (gains[i] === next) return;
		gains[i] = next;
		recordDraft({ format: 'configuration', value: [...gains], labels: gains.map(fmt) });
		const now = performance.now();
		if (now - lastDetent >= 55) {
			lastDetent = now;
			void playSfx('slider-detent', { rate: 0.9 + ((next - MIN_DB) / (MAX_DB - MIN_DB)) * 0.2 });
		}
	}

	/** @param {number} i @param {PointerEvent} e */
	function grab(i, e) {
		if (committed) return;
		dragging = i;
		/** @type {HTMLElement} */ (e.currentTarget).setPointerCapture?.(e.pointerId);
		e.preventDefault();
		// Jump straight to the finger, so tapping a bare column works too.
		set(i, gainAt(e.clientY));
	}

	/** @param {PointerEvent} e */
	function move(e) {
		if (dragging === null) return;
		set(dragging, gainAt(e.clientY));
	}

	function release() {
		dragging = null;
	}

	/** @param {number} i @param {KeyboardEvent} e */
	function key(i, e) {
		let next = null;
		if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = gains[i] + STEP;
		else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = gains[i] - STEP;
		else if (e.key === 'PageUp') next = gains[i] + 3;
		else if (e.key === 'PageDown') next = gains[i] - 3;
		else if (e.key === 'Home') next = MAX_DB;
		else if (e.key === 'End') next = MIN_DB;
		if (next === null) return;
		// Otherwise the arrows scroll the page out from under the fader.
		e.preventDefault();
		set(i, next);
	}

	function flatten() {
		if (committed) return;
		gains = BANDS.map(() => 0);
		recordDraft({ format: 'configuration', value: [...gains], labels: gains.map(fmt) });
	}

	// Placeholder scoring, consistent with every other question — real categories
	// are deferred project-wide.
	/** @param {number[]} g */
	function scoreOf(g) {
		/** @param {number[]} a */
		const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
		const bass = avg(g.slice(0, 2));
		const mid = avg(g.slice(2, 4));
		const treble = avg(g.slice(4));
		const spread = Math.max(...g) - Math.min(...g);
		const smile = (bass + treble) / 2 - mid;

		/** @type {Record<string, number>} */
		let delta;
		// flat = purist restraint · smile = the crowd-pleaser default ·
		// bass = physical · treble = airy detail · frown = contrarian voicing
		if (spread < 1.5) delta = { creative: -2, scope: -1 };
		else if (smile > 2.5) delta = { social: 1, creative: -1 };
		else if (bass - treble > 2.5) delta = { risk: 1 };
		else if (treble - bass > 2.5) delta = { scope: -2 };
		else if (-smile > 2.5) delta = { creative: 2, social: -1 };
		// A curve with no discernible shape genuinely says nothing about you.
		else delta = {};

		if (spread > 18) {
			delta.risk = (delta.risk ?? 0) + 3;
		}
		return delta;
	}

	function commit() {
		if (committed) return;
		committed = true;
		recordDraft({ format: 'configuration', value: [...gains], labels: gains.map(fmt) });
		// The question is taken at its word: the score adopts this curve here and
		// keeps it for the rest of the quiz. Nothing announces it — you asked for
		// this configuration, so you get it, including on the asteroid countdown
		// and the final report. On submit only, so the curve is dialled blind.
		//
		// Not gated on audio being enabled: the transport stores the gains with or
		// without a context, so switching sound on later still honours the answer.
		audio.music.setEq([...gains]);
		// Deliberately not gated on having touched anything — a flat EQ is a
		// position, and it scores as one.
		setTimeout(() => onAnswer(scoreOf(gains)), 900);
	}
</script>

<svelte:window onpointermove={move} onpointerup={release} onpointercancel={release} />

<div class="equalizer">
	<h2><SplitText text="What’s your ideal audio configuration?" /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="panel" class:committed style="animation-delay: {seq.panel}ms">
		<div class="panel-head">
			<button class="flat" onclick={flatten} disabled={committed}>Flat</button>
		</div>

		<div class="plot">
			<div class="ticks" aria-hidden="true">
				<span>+12</span>
				<span>0</span>
				<span>−12</span>
			</div>

			<!-- The labels live inside this column so they inherit the stage's exact
			     width and column grid — no guessing at the tick column's width. -->
			<div class="plot-main">
				<div class="stage" bind:this={stageEl}>
				<!-- viewBox is 100×100 with preserveAspectRatio="none", so x/y are read
				     as percentages of the stage and always line up with the thumbs.
				     Nothing round or textual may live in here — non-uniform scaling
				     would turn a circle into an ellipse and shear any text. -->
				<svg class="viz" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stop-color="var(--ink)" stop-opacity="0.1" />
							<stop offset="1" stop-color="var(--ink)" stop-opacity="0" />
						</linearGradient>
					</defs>

					<!-- One dotted rule at 0 dB — no grid. -->
					<line class="zero" x1="0" y1="50" x2="100" y2="50" vector-effect="non-scaling-stroke" />

					<path class="area" d={areaD} />
					<path class="curve" d={curveD} vector-effect="non-scaling-stroke" />
				</svg>

				<div class="bands" role="group" aria-label="Equalizer bands">
					{#each BANDS as band, i}
						<!-- The whole column is the slider — that's what you can click, drag
						     and focus. The thumb inside is only its visual indicator, so it
						     carries no role of its own. -->
						<div
							class="band"
							role="slider"
							tabindex="0"
							aria-label={band.label}
							data-reader-option="{band.label} level"
							aria-orientation="vertical"
							aria-valuemin={MIN_DB}
							aria-valuemax={MAX_DB}
							aria-valuenow={gains[i]}
							aria-valuetext="{fmt(gains[i])} decibels"
							onpointerdown={(e) => grab(i, e)}
							onkeydown={(e) => key(i, e)}
						>
							<span class="track"></span>
							<span
								class="thumb"
								class:active={dragging === i}
								style="top: {yOf(gains[i])}%"
								aria-hidden="true"
							></span>
							{#if dragging === i}
								<span class="readout" style="top: {yOf(gains[i])}%">{fmt(gains[i])}</span>
							{/if}
						</div>
					{/each}
				</div>
				</div>

				<div class="labels" aria-hidden="true">
					{#each BANDS as band}
						<span>{band.label}</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<SubmitAnswer
		{committed}
		label="Next →"
		committedLabel="Tuned."
		delay={seq.next}
		onsubmit={commit}
	/>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.equalizer > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}

	/* No frame and no fill — the plot sits directly on the certificate, so the
	   curve and the faders are the only things drawn. */
	.panel {
		animation: rise 0.42s both;
		-webkit-user-select: none;
		user-select: none;
	}
	.panel-head {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1.1rem;
	}
	.flat {
		padding: 0.3rem 0.7rem;
		font: inherit;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
	}
	.flat:hover:not(:disabled) {
		border-color: var(--ink);
		color: var(--ink);
	}
	.flat:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.plot {
		display: flex;
		gap: 0.75rem;
	}
	.ticks {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: clamp(13rem, 42vw, 17rem);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		/* Nudge so each label's centre lines up with its gridline. */
		margin: -0.4rem 0;
		padding: 0.4rem 0;
	}

	/* The one measured box: SVG overlay, fader columns and pointer math all read
	   this element. No `overflow: hidden` — it would clip the thumbs at ±12 dB. */
	.plot-main {
		flex: 1;
		min-width: 0;
	}
	.stage {
		position: relative;
		height: clamp(13rem, 42vw, 17rem);
		touch-action: none;
	}
	.viz {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	/* Round caps on a zero-length dash render as dots. */
	.zero {
		stroke: var(--rule);
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-dasharray: 0 5;
	}
	.area {
		fill: url(#eq-fill);
	}
	.curve {
		fill: none;
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* NO `gap` here: the curve's x math assumes each column is exactly 1/N of the
	   stage. Spacing comes from the columns being wider than their tracks. */
	.bands {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		height: 100%;
	}
	.band {
		position: relative;
		cursor: pointer;
	}
	.track {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 2px;
		transform: translateX(-50%);
		background: var(--border);
	}
	/* Travel is the FULL stage height and the thumb is centred on its value —
	   never inset the travel by half a thumb, that is what desyncs the curve.
	   No transition on `top`: the SVG path has none, so they'd move apart. */
	.thumb {
		position: absolute;
		left: 50%;
		width: 16px;
		height: 16px;
		transform: translate(-50%, -50%);
		background: var(--ink);
		/* The white ring is what opens a gap between the dot and the curve and
		   track running underneath it, so the dot reads as sitting on top. */
		border: 3px solid var(--surface);
		border-radius: 50%;
		box-sizing: content-box;
		cursor: grab;
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
	}
	/* Comfortable touch target without growing the visible thumb. */
	.thumb::before {
		content: '';
		position: absolute;
		inset: -11px;
	}
	.thumb.active {
		cursor: grabbing;
		transform: translate(-50%, -50%) scale(1.15);
	}
	/* Focus lives on the column, but the ring belongs around the thumb — that's
	   the part the keyboard is actually moving. */
	.band:focus {
		outline: none;
	}
	.band:focus-visible .thumb {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.readout {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		margin-top: -1.9rem;
		font-size: 0.68rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		white-space: nowrap;
		pointer-events: none;
	}

	.labels {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		margin-top: 0.6rem;
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		line-height: 1.25;
		color: var(--muted);
		text-align: center;
	}

	.panel.committed .thumb {
		pointer-events: none;
	}

	@media (max-width: 520px) {
		.plot {
			gap: 0.5rem;
		}
		.labels {
			font-size: 0.55rem;
			letter-spacing: 0.02em;
		}
	}
</style>
