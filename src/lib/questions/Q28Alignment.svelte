<script>
	// Q28 — drag the inner planets around their orbits (and the Moon around
	// Earth) to compose your "ideal alignment." Played completely straight: a
	// sober orbital diagram, asked as if it were a normal personality question.
	//
	// Bodies are rail-bound — dragging changes only a body's angle, never its
	// radius. The Moon's orbit is nested on Earth's current position, so it
	// travels along when Earth is moved.
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { VIEW, CX, CY, SUN_R, PLANETS, MOON, polar, angleOf, norm } from '$lib/orbits.js';
	import { approximateAngles } from '$lib/orbits.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	let { onAnswer } = $props();

	const seq = $derived.by(() => {
		const c = cascade();
		return { prompt: c.text(prompt), rule: c.rule(), sky: c.block(), actions: c.action() };
	});

	const prompt = 'What is your ideal planetary alignment?';

	// A pleasing default spread so the diagram doesn't open in a straight line.
	const angles = tweened(
		/** @type {Record<string, number>} */ ({ mercury: 35, venus: 145, earth: 250, mars: 20, moon: 60 }),
		{ duration: 0, easing: cubicOut }
	);

	/** @type {string | null} */
	let dragging = $state(null);
	/** @type {SVGSVGElement | null} */
	let svgEl = $state(null);
	let committed = $state(false);

	const earthPos = $derived(polar(CX, CY, 145, $angles.earth));
	const moonPos = $derived(polar(earthPos.x, earthPos.y, MOON.orbit, $angles.moon));

	/** Convert a client point into viewBox coordinates. The viewBox is square and
	 *  preserveAspectRatio is default, so the mapping is a straight linear scale.
	 *  @param {number} clientX @param {number} clientY */
	function toView(clientX, clientY) {
		if (!svgEl) return { x: CX, y: CY };
		const rect = svgEl.getBoundingClientRect();
		return {
			x: ((clientX - rect.left) / rect.width) * VIEW,
			y: ((clientY - rect.top) / rect.height) * VIEW
		};
	}

	/** @param {string} id @param {number} deg */
	function setAngle(id, deg) {
		angles.update((a) => {
			const next = { ...a, [id]: norm(deg) };
			recordDraft({ format: 'configuration', value: next });
			return next;
		}, { duration: 0 });
	}

	/** @param {string} id @param {PointerEvent} e */
	function grab(id, e) {
		if (committed) return;
		dragging = id;
		void playSfx('drag-pickup');
		/** @type {Element} */ (e.currentTarget).setPointerCapture?.(e.pointerId);
		e.preventDefault();
	}

	/** @param {PointerEvent} e */
	function move(e) {
		if (!dragging) return;
		const p = toView(e.clientX, e.clientY);
		// Planets pivot around the Sun; the Moon pivots around Earth.
		const center = dragging === 'moon' ? earthPos : { x: CX, y: CY };
		setAngle(dragging, angleOf(center.x, center.y, p.x, p.y));
	}

	function release() {
		if (dragging) void playSfx('drop-valid', { rate: 1.12 });
		dragging = null;
	}

	/** @param {string} id @param {KeyboardEvent} e */
	function key(id, e) {
		const delta = e.key === 'ArrowLeft' ? 3 : e.key === 'ArrowRight' ? -3 : 0;
		if (!delta || committed) return;
		e.preventDefault();
		setAngle(id, $angles[id] + delta);
		void playSfx('slider-detent');
	}

	// Glide every body to where it actually is right now.
	function useToday() {
		if (committed) return;
		angles.set(approximateAngles(), { duration: 1400 });
	}

	function commit() {
		if (committed) return;
		committed = true;
		recordDraft({ format: 'configuration', value: $angles });
		// Tightly clustered vs. evenly scattered planets: herding everything to
		// one side is a dramatic, composed gesture; even spacing is bookkeeping.
		const spread = PLANETS.map((p) => $angles[p.id]).sort((a, b) => a - b);
		const gaps = spread.map((v, i) => norm((spread[(i + 1) % spread.length] ?? v) - v));
		const tight = Math.max(...gaps) > 200;
		setTimeout(
			() =>
				onAnswer(
					tight ? { creative: 2, risk: 1 } : { scope: -2 }
				),
			900
		);
	}
</script>

<svelte:window onpointermove={move} onpointerup={release} onpointercancel={release} />

<div class="alignment" class:committed>
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<svg
		bind:this={svgEl}
		viewBox="0 0 {VIEW} {VIEW}"
		role="img"
		aria-label="Abstract diagram of the Sun, the inner planets, and the Moon"
	>
		<!-- Orbit rails -->
		{#each PLANETS as p}
			<circle class="rail" cx={CX} cy={CY} r={p.orbit} />
		{/each}
		<!-- The Moon's rail is nested on Earth, so it travels with it -->
		<circle class="rail rail--moon" cx={earthPos.x} cy={earthPos.y} r={MOON.orbit} />

		<circle class="sun" cx={CX} cy={CY} r={SUN_R} />

		{#each PLANETS as p}
			{@const pos = polar(CX, CY, p.orbit, $angles[p.id])}
			<g
				class="body"
				class:active={dragging === p.id}
				role="slider"
				tabindex="0"
				aria-label="{p.label} orbital position"
				data-reader-option="{p.label} orbital position"
				aria-valuemin={0}
				aria-valuemax={360}
				aria-valuenow={Math.round($angles[p.id])}
				onpointerdown={(e) => grab(p.id, e)}
				onkeydown={(e) => key(p.id, e)}
			>
				<!-- Oversized transparent target: the planets themselves are tiny -->
				<circle class="hit" cx={pos.x} cy={pos.y} r="17" />
				<circle class="planet" cx={pos.x} cy={pos.y} r={p.r} />
				<text class="tag" data-reader-svg-label x={pos.x} y={pos.y - p.r - 8}>{p.label}</text>
			</g>
		{/each}

		<g
			class="body"
			class:active={dragging === 'moon'}
			role="slider"
			tabindex="0"
			aria-label="Moon orbital position"
			data-reader-option="Moon orbital position"
			aria-valuemin={0}
			aria-valuemax={360}
			aria-valuenow={Math.round($angles.moon)}
			onpointerdown={(e) => grab('moon', e)}
			onkeydown={(e) => key('moon', e)}
		>
			<circle class="hit" cx={moonPos.x} cy={moonPos.y} r="14" />
			<circle class="moon" cx={moonPos.x} cy={moonPos.y} r={MOON.r} />
			<text class="tag" data-reader-svg-label x={moonPos.x} y={moonPos.y - MOON.r - 7}>{MOON.label}</text>
		</g>
	</svg>

	<div class="actions" style="animation-delay: {seq.actions}ms">
		<button class="ghost" onclick={useToday} disabled={committed}>
			Use today’s actual positions
		</button>
		<SubmitAnswer
			{committed}
			label="Lock in this alignment →"
			margin="0"
			onsubmit={commit}
		/>
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.alignment > hr {
		margin: 0 0 1rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		max-width: 30rem;
		margin: 0 auto 1.5rem;
		touch-action: none;
	}

	.rail {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1;
	}
	.rail--moon {
		stroke-dasharray: 2 4;
	}
	.sun {
		fill: var(--ink);
	}
	.planet {
		fill: var(--ink);
	}
	.moon {
		fill: var(--muted);
	}
	.hit {
		fill: transparent;
	}

	.body {
		cursor: grab;
		touch-action: none;
	}
	.body:focus-visible {
		outline: none;
	}
	.body:focus-visible .planet,
	.body:focus-visible .moon {
		stroke: var(--ink);
		stroke-width: 2;
		paint-order: stroke;
	}
	.body.active {
		cursor: grabbing;
	}
	.body.active .planet,
	.body.active .moon {
		stroke: var(--ink);
		stroke-width: 6;
		stroke-opacity: 0.18;
	}
	.tag {
		fill: var(--muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-anchor: middle;
		pointer-events: none;
		user-select: none;
	}

	.actions {
		animation: rise 0.42s both;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.ghost {
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
		color: inherit;
		border: 1px solid var(--rule);
	}
	.ghost:hover:not(:disabled) {
		background: var(--accent-soft);
	}
	.ghost:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (max-width: 480px) {
		.actions {
			flex-direction: column;
		}
		.ghost {
			width: 100%;
		}
	}
</style>
