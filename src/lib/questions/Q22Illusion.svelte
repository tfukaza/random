<script>
	// Q22 — "which circle looks bigger?" Styled as the classic Ebbinghaus
	// illusion (equal circles made to look different by their neighbors)…
	// except here the left circle genuinely IS smaller (r=34 vs r=40). People
	// who recognize the illusion will smugly answer "same size" — and be wrong.
	//
	// Mechanism being prototyped: a post-answer REVEAL animation before the quiz
	// advances. On pick, dotted tangent lines draw outward from the top and
	// bottom of both circles toward the other side, crossing in the middle —
	// making it obvious which circle is actually bigger. Then we move on.
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	let { onAnswer } = $props();

	const seq = $derived.by(() => {
		const c = cascade();
		return { prompt: c.text(prompt), rule: c.rule(), figure: c.block(), cards: c.items(options.length) };
	});

	const prompt = 'Which orange circle looks bigger?';

	const options = [
		// left = contrarian (it's smaller AND illusion-shrunk); right = actually
		// looked; "same" = pattern-matched the famous illusion and got burned.
		{ label: 'The left circle', score: { risk: 2, scope: 1 } },
		{ label: 'The right circle', score: { scope: -3 } },
		{ label: 'They’re the same size', score: { scope: 2, risk: -1 } }
	];

	/** @type {number | null} */
	let picked = $state(null);

	// 0 → 1 drives how far the reveal lines have drawn across the diagram.
	const reveal = tweened(0, { duration: 1100, easing: cubicOut });

	/** @param {number} i */
	function choose(i) {
		picked = i;
		void playSfx('illusion-reveal');
		reveal.set(1, { delay: 200 });
		// Let the reveal draw + a beat to absorb it, then advance.
		setTimeout(() => onAnswer(options[i].score), 2600);
	}

	// Satellite ring positions, precomputed for the SVG.
	/** @param {number} cx @param {number} cy @param {number} dist @param {number} n */
	function ring(cx, cy, dist, n) {
		return Array.from({ length: n }, (_, i) => {
			const a = (i / n) * Math.PI * 2 - Math.PI / 2;
			return { x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist };
		});
	}

	// Left: actually-smaller orange center (r=34) ringed by big satellites.
	const left = { cx: 160, cy: 130, r: 34, ring: ring(160, 130, 80, 6), satR: 30 };
	// Right: actually-bigger orange center (r=40) ringed by tiny satellites.
	const right = { cx: 480, cy: 130, r: 40, ring: ring(480, 130, 62, 10), satR: 9 };
</script>

<div class="illusion">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<svg viewBox="0 0 640 260" role="img" aria-label="Two orange circles, each surrounded by gray circles">
		{#each left.ring as p}
			<circle cx={p.x} cy={p.y} r={left.satR} class="satellite" />
		{/each}
		<circle cx={left.cx} cy={left.cy} r={left.r} class="target" />

		{#each right.ring as p}
			<circle cx={p.x} cy={p.y} r={right.satR} class="satellite" />
		{/each}
		<circle cx={right.cx} cy={right.cy} r={right.r} class="target" />

		{#if picked !== null}
			<!-- Reveal: dotted tangent lines drawing toward the opposite circle.
			     Left pair sweeps right, right pair sweeps left; they cross mid-
			     diagram, exposing the (real) size gap between the two circles. -->
			<line
				class="guide"
				x1={left.cx}
				y1={left.cy - left.r}
				x2={left.cx + 370 * $reveal}
				y2={left.cy - left.r}
			/>
			<line
				class="guide"
				x1={left.cx}
				y1={left.cy + left.r}
				x2={left.cx + 370 * $reveal}
				y2={left.cy + left.r}
			/>
			<line
				class="guide"
				x1={right.cx}
				y1={right.cy - right.r}
				x2={right.cx - 370 * $reveal}
				y2={right.cy - right.r}
			/>
			<line
				class="guide"
				x1={right.cx}
				y1={right.cy + right.r}
				x2={right.cx - 370 * $reveal}
				y2={right.cy + right.r}
			/>
		{/if}
	</svg>

	<div class="choices">
		{#each options as opt, i}
			<button
				class="card"
				class:picked={picked === i}
				style="animation-delay: {seq.cards + i * ITEM_MS}ms"
				disabled={picked !== null}
				onclick={() => choose(i)}
			>
				{opt.label}
			</button>
		{/each}
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.illusion > hr {
		margin: 0 0 1rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		margin-bottom: 1.5rem;
	}
	.satellite {
		fill: #c5beb2;
	}
	.target {
		fill: #ff8c1a;
	}
	.guide {
		stroke: #55504a;
		stroke-width: 2;
		stroke-dasharray: 3 6;
		stroke-linecap: round;
	}
	.choices {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}
	.card {
		padding: 1rem 1.1rem;
		text-align: center;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		color: inherit;
		font-weight: 500;
		animation: rise 0.42s both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.card:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--ink);
	}
	.card.picked {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
	}
	.card:disabled:not(.picked) {
		opacity: 0.55;
	}
	@media (max-width: 560px) {
		.choices {
			grid-template-columns: 1fr;
		}
	}
</style>
