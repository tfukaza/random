<script>
	// scene-recall, spatial branch — the "which person stood out, and where were
	// they?" test. A blank canvas, the same 500×400 frame the scene occupied, and
	// a single tap: land it on a figure and the boast holds; tap empty ground and
	// you have placed a person who was never there.
	//
	// Per P6 nothing is revealed at answer time — no hit/miss flash. The tap is
	// recorded and scored silently, like every other probe; the verdict only ever
	// surfaces in the final tally. The canvas is deliberately blank: recalling
	// roughly where someone stood on an empty frame IS the spatial test.
	//
	// People positions come from PEOPLE in sceneModel, MEASURED off the base image
	// (see the warning there). This component only needs the same coordinate
	// system — a 0..500 × 0..400 viewBox — for the tap to map onto them.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	import { recordDraft, recordEvent } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { PEOPLE, PROBES, personAt } from './sceneModel.js';
	import { SCENE_BASE } from './sceneSprites.js';

	let { onAnswer, unseen = false } = $props();

	const PROMPT = PROBES.spatial.prompt;
	const VW = 500;
	const VH = 400;

	// Dev-only: lay the actual scene image and the measured hit circles over the
	// canvas so the coordinates can be checked against the painted figures — the
	// people live in the base image, not in data, so this is the only way to see
	// whether PEOPLE still lines up (see the warning in sceneModel). Off by
	// default; the blank canvas is the real question.
	const DEV = import.meta.env.DEV;
	let showGuide = $state(false);

	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), canvas: c.block(), actions: c.action() };
	})();

	/** @type {SVGSVGElement} */
	let svgEl;
	/** @type {{ x: number, y: number } | null} */
	let pin = $state(null);
	let committed = $state(false);

	/** @param {PointerEvent} e */
	function place(e) {
		if (committed) return;
		const rect = svgEl.getBoundingClientRect();
		// preserveAspectRatio="none" + a 5:4 box → a straight linear map, no letterbox.
		const x = ((e.clientX - rect.left) / rect.width) * VW;
		const y = ((e.clientY - rect.top) / rect.height) * VH;
		pin = { x: Math.max(0, Math.min(VW, x)), y: Math.max(0, Math.min(VH, y)) };
		void playSfx('ui-tap');
	}

	function commit() {
		if (committed || !pin) return;
		committed = true;
		const hit = personAt(pin.x, pin.y);
		recordDraft({
			format: 'scene-pinpoint',
			value: { x: Math.round(pin.x), y: Math.round(pin.y), hit: hit?.id ?? null },
			label: hit ? `on ${hit.id}` : 'empty ground'
		});
		recordEvent('scene-recall', { probe: 'spatial', correct: !!hit, unseen });
		// A deep-link never saw the scene, so it is not billed. Otherwise a figure
		// vindicates the claim; empty ground is it collapsing. scope runs negative
		// = detail-oriented, matching the other spatial scoring.
		const delta = unseen ? {} : hit ? { scope: -3, honesty: 2 } : { scope: 2, honesty: -2 };
		void playSfx(hit ? 'drop-valid' : 'drop-invalid');
		setTimeout(() => onAnswer(delta), 620);
	}
</script>

<div class="pinpoint">
	<h2><SplitText text={PROMPT} stagger={40} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="canvas-wrap" style="animation-delay: {seq.canvas}ms">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg
			bind:this={svgEl}
			class="canvas"
			viewBox="0 0 {VW} {VH}"
			preserveAspectRatio="none"
			role="img"
			aria-label="A blank frame the size of the scene. Tap where a person was standing."
			onpointerdown={place}
		>
			{#if DEV && showGuide}
				<!-- debug · dev only: the painted scene behind the measured hit zones -->
				<image href={SCENE_BASE} x="0" y="0" width={VW} height={VH} opacity="0.85" preserveAspectRatio="none" />
				{#each PEOPLE as p}
					<rect x={p.x} y={p.y} width={p.w} height={p.h} class="hitzone" />
				{/each}
			{/if}
			<rect x="1" y="1" width={VW - 2} height={VH - 2} class="frame" />
			<!-- A single faint ground line for orientation — people stood on the
			     pavement, not floating — without hinting at any horizontal position. -->
			<line x1="0" y1="328" x2={VW} y2="328" class="ground" />
			{#if pin}
				<g class="pin" transform="translate({pin.x} {pin.y})">
					<line x1="0" y1="0" x2="0" y2="-22" />
					<circle cx="0" cy="-26" r="6" />
					<circle cx="0" cy="0" r="2.5" class="pin-foot" />
				</g>
			{/if}
		</svg>
	</div>

	<div class="actions" style="animation-delay: {seq.actions}ms">
		<SubmitAnswer disabled={!pin} {committed} onsubmit={commit} />
	</div>

	{#if DEV}
		<button type="button" class="debug-toggle" onclick={() => (showGuide = !showGuide)}>
			🛠 {showGuide ? 'hide' : 'show'} hit boxes · dev only
		</button>
	{/if}
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.pinpoint > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	.canvas-wrap {
		margin-bottom: 1.75rem;
		animation: rise 0.42s both;
	}
	.canvas {
		display: block;
		width: 100%;
		aspect-ratio: 5 / 4;
		background: var(--surface);
		cursor: crosshair;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}
	.frame {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1;
	}
	.ground {
		stroke: var(--rule);
		stroke-width: 1;
		stroke-dasharray: 3 6;
		opacity: 0.5;
	}
	.pin {
		stroke: var(--ink);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.pin circle {
		fill: var(--surface);
	}
	.pin .pin-foot {
		fill: var(--ink);
		stroke: none;
	}
	/* debug · dev only */
	.hitzone {
		fill: rgba(60, 130, 90, 0.22);
		stroke: #2f7d55;
		stroke-width: 2;
	}
	.debug-toggle {
		margin-top: 0.75rem;
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--rule);
		border-radius: 0.35rem;
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
	}
</style>
