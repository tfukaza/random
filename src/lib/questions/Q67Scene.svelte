<script>
	// scene-watch — a street corner, animated, watched for a fixed window. The
	// question itself asks almost nothing; the NEXT one bills it, and the taker
	// is not told that. Per P6 nothing here hints that anything is coming: the
	// prompt is an ordinary aesthetic question, the kind the genre asks all the
	// time, and the honest answer to it is also the honest answer to "did you
	// look at this properly".
	//
	// The art begins as one canonical illustration so its lighting, perspective,
	// and depth all agree. sceneModel.js remains the semantic source of truth for
	// the probes; the generated plates and cutouts are checked alongside it.
	//
	// EVERYTHING IS CSS-ANIMATED, INCLUDING THE WATCH WINDOW. Not a stylistic
	// choice — docs/design.md is explicit that JS timing (`setTimeout`, `tweened`)
	// escapes PatienceLens, and that a question animating before the answer
	// "would escape the governor — the fix would be for it to consult the rate,
	// not for the lens to chase it". A `setTimeout` window would run at full
	// speed while the scene around it crawled at ×0.05. Driving the window off
	// `animationend` means the patient path stretches the watch and the events
	// together, for free, and they stay in step by construction.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { recordDraft, recordEvent } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { scene as sceneState } from './sceneState.svelte.js';
	import { EVENTS, WATCH_MS } from './sceneModel.js';
	import { PROP_SPRITES, SCENE_BASE } from './sceneSprites.js';

	let { onAnswer } = $props();

	// OVERT, not disguised. This used to pose as an aesthetic question and never
	// admit a memory test was coming; the author's call is that it is now openly
	// an IQ-test-flavoured "study this" screen. The surprise that survives lives
	// in scene-recall: which faculty gets probed is decided by what the taker
	// said back in recall-trap, and they were never told that.
	const PREMISE = 'A corner you have walked past a hundred times. This time, look.';
	const PROMPT = 'Watch this scene. Let it soak in.';
	const NOTE = "You'll be asked about it.";

	const seq = (() => {
		const c = cascade();
		c.text(PREMISE);
		c.text(PROMPT, 40);
		return { rule: c.rule(), stage: c.block(), actions: c.action() };
	})();

	/** @type {HTMLElement} */
	let stageEl;
	let watched = $state(false);
	let replayKey = $state(0);
	let zoom = $state({
		visible: false,
		touching: false,
		x: 50,
		y: 50
	});
	/** @type {Set<Animation>} */
	const paused = new Set();

	// Event timings become animation delays as a fraction of the window, so the
	// order rendered IS the order sceneModel declares. Scaling both off WATCH_MS
	// is what keeps the episodic probe's answer true.
	const delayFor = (/** @type {string} */ id) =>
		((EVENTS.find((e) => e.id === id)?.at ?? 0) * WATCH_MS).toFixed(0);

	/** @param {PointerEvent} event */
	function positionZoom(event) {
		const frame = /** @type {HTMLElement} */ (event.currentTarget);
		const rect = frame.getBoundingClientRect();
		zoom = {
			...zoom,
			visible: true,
			x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
			y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
		};
	}

	/** @param {PointerEvent} event */
	function enterMagnifier(event) {
		if (event.pointerType === 'mouse') positionZoom(event);
	}
	/** @param {PointerEvent} event */
	function moveMagnifier(event) {
		if (event.pointerType === 'mouse' || zoom.touching) positionZoom(event);
	}
	function leaveMagnifier() {
		if (!zoom.touching) zoom = { ...zoom, visible: false };
	}
	/** @param {PointerEvent} event */
	function beginTouchMagnifier(event) {
		if (event.pointerType === 'mouse') return;
		event.preventDefault();
		const frame = /** @type {HTMLElement} */ (event.currentTarget);
		// Synthetic inspection events do not always create a capturable pointer;
		// real Safari/Chrome touch streams do. The gesture still works either way.
		try {
			frame.setPointerCapture(event.pointerId);
		} catch {}
		positionZoom(event);
		zoom = { ...zoom, touching: true };
	}
	/** @param {PointerEvent} event */
	function endTouchMagnifier(event) {
		if (event.pointerType === 'mouse') return;
		const frame = /** @type {HTMLElement} */ (event.currentTarget);
		if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
		zoom = { ...zoom, visible: false, touching: false };
	}

	function endWatch() {
		if (watched) return;
		watched = true;
		recordEvent('scene-watched', { ms: WATCH_MS });
		sceneState.seen = true;
	}

	function replayScene() {
		if (committed) return;
		// Replacing the keyed live canvas restarts every CSS timeline together,
		// including the invisible watch clock. This keeps the actors, event order,
		// and Continue gate on the same clock under PatienceLens.
		paused.clear();
		watched = false;
		zoom = { visible: false, touching: false, x: 50, y: 50 };
		replayKey += 1;
		recordEvent('scene-replayed', { replay: replayKey });
	}

	// Fairness, not polish. A memory test whose observation window burns down
	// while the taker is on another tab is simply a broken test. Same discipline
	// as Q47Signs, and the CSS-driven window means pausing the animations pauses
	// the clock too — there is no second timer that could drift out of step.
	function pauseScene() {
		if (!stageEl) return;
		for (const animation of stageEl.getAnimations({ subtree: true })) {
			if (animation.playState !== 'running') continue;
			animation.pause();
			paused.add(animation);
		}
	}
	function resumeScene() {
		for (const animation of paused) if (animation.playState === 'paused') animation.play();
		paused.clear();
	}
	function onVisibility() {
		if (document.hidden) pauseScene();
		else resumeScene();
	}

	$effect(() => {
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			paused.clear();
		};
	});

	// A study screen scores nothing — the whole read happens next door, in
	// scene-recall. onAnswer({}) is a no-op through mergeScores, and this is the
	// one question in the quiz that deliberately carries no delta. Continue is
	// gated on `watched`, so "let it soak in" is enforced rather than suggested:
	// you cannot leave until the window has actually run.
	let committed = $state(false);
	function commit() {
		if (committed || !watched) return;
		committed = true;
		recordDraft({ format: 'scene-study', value: 'watched', label: 'watched' });
		setTimeout(() => onAnswer({}), 400);
	}
</script>

<div class="scene-q">
	<p class="premise"><SplitText text={PREMISE} /></p>
	<h2><SplitText text={PROMPT} delay={40} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="scene-stage" bind:this={stageEl} style="animation-delay: {seq.stage}ms">
		{#key replayKey}
		<div
			class="scene-frame"
			role="group"
			aria-label="Scene detail magnifier"
			onpointerenter={enterMagnifier}
			onpointermove={moveMagnifier}
			onpointerleave={leaveMagnifier}
			onpointerdown={beginTouchMagnifier}
			onpointerup={endTouchMagnifier}
			onpointercancel={endTouchMagnifier}
			title="Hover or tap to magnify the scene"
		>
		<div
			class="scene-canvas"
			class:zoomed={zoom.visible}
			style={`--zoom-x:${zoom.x}%;--zoom-y:${zoom.y}%;`}
		>
		<svg
			viewBox="0 0 500 400"
			role="img"
			aria-label="A painterly street corner at dusk."
			data-scene-stage
			data-scene-replay={replayKey}
		>
			<defs>
				<radialGradient id="lamp-light">
					<stop offset="0" stop-color="#ffeaa3" stop-opacity=".9" />
					<stop offset=".45" stop-color="#ffd36a" stop-opacity=".38" />
					<stop offset="1" stop-color="#ffd36a" stop-opacity="0" />
				</radialGradient>
				<!-- The meteor is clipped to the open sky. Its final frames therefore
				     vanish behind the right-hand trees instead of crossing their faces. -->
				<clipPath id="open-sky">
					<path d="M0 0H500V104L470 102L444 108L416 113L386 123L350 128L315 124L280 120L240 118L190 126L140 140L90 146L40 145L0 142Z" />
				</clipPath>
			</defs>

			<image class="scene-base" href={SCENE_BASE} x="0" y="0" width="500" height="400" preserveAspectRatio="none" />

			<g class="lamp-event" data-scene-event="lamp-on" style="animation-delay: {delayFor('lamp-on')}ms">
				<circle cx="47" cy="79" r="28" fill="url(#lamp-light)" />
				<circle class="lamp-core" cx="47" cy="79" r="8" />
			</g>

			<!-- Anchors hold scene placement; child groups alone animate. Keeping
			     those transforms separate prevents CSS from replacing SVG translate. -->
			<g class="meteor-anchor" clip-path="url(#open-sky)" data-scene-event="meteor-fall">
				<g class="meteor-motion" style="animation-delay: {delayFor('meteor-fall')}ms">
					<image href={PROP_SPRITES.meteor} x="390" y="4" width="96" height="68" preserveAspectRatio="xMidYMid meet" />
				</g>
			</g>

			<g class="cat-anchor" data-scene-event="cat-cross">
				<g class="cat-motion" style="animation-delay: {delayFor('cat-cross')}ms">
					<image href={PROP_SPRITES.cat} x="66" y="269" width="45" height="39" preserveAspectRatio="xMidYMid meet" />
				</g>
			</g>

			<g class="bus-anchor" data-scene-event="bus-leave">
				<g class="bus-motion" style="animation-delay: {delayFor('bus-leave')}ms">
					<image href={PROP_SPRITES.bus} x="361" y="226" width="255" height="137" preserveAspectRatio="xMinYMid meet" />
				</g>
			</g>

			<!-- The watch window, as a real animation so PatienceLens governs it.
			     Zero-size and invisible; it exists only to end on time. -->
			<rect
				class="watch-clock"
				x="0"
				y="0"
				width="0"
				height="0"
				style="animation-duration: {WATCH_MS}ms"
				onanimationend={endWatch}
			/>
		</svg>
		</div>
		</div>
		{/key}
		<p class="watch-note" class:done={watched}>
			{watched ? 'Ready.' : NOTE}
		</p>
		<p class="magnify-note">Hover or tap the picture to magnify details.</p>
		<button
			type="button"
			class="replay-button"
			disabled={committed}
			data-reader-label
			onclick={replayScene}
		>
			↻ Replay scene
		</button>
	</div>

	<!-- Continue is disabled until the watch window ends, so the study time is
	     real. `data-reader-label` keeps it narratable for the fast reader. -->
	<div class="actions" style="animation-delay: {seq.actions}ms">
		<SubmitAnswer
			disabled={!watched}
			{committed}
			label="Continue →"
			committedLabel="Committed to memory."
			onsubmit={commit}
		/>
	</div>
</div>

<style>
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1rem;
		animation: rise 0.5s both;
	}
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.scene-q > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}

	.scene-stage {
		animation: rise 0.42s both;
		margin-bottom: 1.5rem;
	}
	.scene-frame {
		position: relative;
		overflow: hidden;
		cursor: zoom-in;
		touch-action: none;
	}
	.scene-canvas {
		transform-origin: var(--zoom-x) var(--zoom-y);
		transition: transform 120ms ease-out;
		will-change: transform;
	}
	.scene-canvas.zoomed { transform: scale(3); }
	svg {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--rule);
		background: var(--surface);
	}
	.scene-base { pointer-events: none; }
	/* ── the four events ──────────────────────────────────────────────────── */
	.lamp-event { opacity: 0; animation: lamp-on 1.4s both; }
	.cat-motion { animation: cat-cross 3.4s ease-in-out both; }
	.meteor-motion { animation: meteor-fall 2.2s cubic-bezier(.24,.72,.4,1) both; }
	.bus-motion { animation: bus-leave 2.8s cubic-bezier(.42,0,.7,.35) both; }
	@keyframes lamp-on {
		0%, 28% { opacity: 0; }
		34% { opacity: 1; }
		43% { opacity: .25; }
		54%, 100% { opacity: 1; }
	}
	.lamp-core { fill: #ffe9a0; }
	@keyframes cat-cross {
		0% { transform: translate(0, 0) rotate(0deg); }
		20% { transform: translate(18px, -1px) rotate(-1deg); }
		40% { transform: translate(36px, 0) rotate(1deg); }
		60% { transform: translate(54px, -1px) rotate(-1deg); }
		80% { transform: translate(72px, 0) rotate(1deg); }
		100% { transform: translate(90px, -1px) rotate(0deg); }
	}
	@keyframes meteor-fall {
		0% { opacity: 0; transform: translate(38px, -26px); }
		12%, 76% { opacity: 1; }
		100% { opacity: .7; transform: translate(-78px, 96px); }
	}
	@keyframes bus-leave {
		0%, 12% { transform: translate(0, 0); }
		22% { transform: translate(4px, 1px); }
		100% { transform: translate(190px, 0); }
	}

	/* Finite, so PatienceLens's arrival check is never held open by it — an
	   infinite decoration would stall the patient path forever. */
	.watch-clock {
		animation-name: watch;
		animation-timing-function: linear;
		animation-fill-mode: both;
		fill: none;
	}
	@keyframes watch {
		from { opacity: 0; }
		to { opacity: 0; }
	}

	.watch-note {
		margin: 0.6rem 0 0;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	.watch-note.done {
		color: var(--ink);
	}
	.magnify-note {
		margin: 0.2rem 0 0;
		font-size: 0.68rem;
		color: var(--muted);
		font-style: italic;
	}
	.replay-button {
		margin-top: 0.55rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.72rem;
		text-decoration: underline;
		text-underline-offset: 0.18em;
		cursor: pointer;
	}
	.replay-button:disabled {
		color: var(--muted);
		cursor: default;
		opacity: 0.6;
	}

	.actions {
		animation: rise 0.42s both;
	}

	@media (prefers-reduced-motion: reduce) {
		/* The events still have to HAPPEN — the next question asks about their
		   order — so they are stepped rather than removed. */
		.cat-motion,
		.meteor-motion,
		.bus-motion,
		.lamp-event {
			animation-timing-function: step-end;
		}
	}
</style>
