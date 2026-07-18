<script>
	// Q31 — the Rorschach question (backlog idea 3), except the "inkblot" is pure
	// color Perlin noise. There is nothing in it. That is the joke: the quiz asks
	// what you see in a field of literal random numbers, and will presumably tell
	// you something profound about yourself based on the answer.
	//
	// Three independent fbm fields drive R/G/B, each with its own seed and a small
	// domain offset, so the channels drift apart into soft color regions instead of
	// collapsing into grayscale.
	import { makeNoise2D, fbm } from '$lib/perlin';

	let { onAnswer } = $props();

	const prompt = 'What do you see in here?';

	const options = [
		{ label: 'A cat', score: { connector: 3 } },
		{ label: 'A cloud', score: { sage: 3 } },
		{ label: 'A car', score: { maker: 3 } },
		{ label: 'A house', score: { adventurer: 3 } }
	];

	// Render small and let CSS scale it up — the blur from upscaling is free and
	// makes the field look painted rather than pixel-sampled.
	const W = 240;
	const H = 150;
	// Feature size. Lower = broader blobs. Kept deliberately broad, and octaves
	// low, so the field has large soft regions the eye can pattern-match onto —
	// too much high-frequency detail just reads as colorful static.
	const SCALE = 0.011;
	const OCTAVES = 3;

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	// One seed per mount, so every taker gets a different meaningless picture.
	let seed = $state(Math.floor(Math.random() * 1e9));

	/** @type {number | null} */
	let picked = $state(null);

	function paint() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Separate samplers per channel — same seed family, different streams.
		const nr = makeNoise2D(seed);
		const ng = makeNoise2D(seed + 0x9e37);
		const nb = makeNoise2D(seed + 0x51ed);

		const img = ctx.createImageData(W, H);
		const d = img.data;
		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				const u = x * SCALE;
				const v = y * SCALE;
				// The offsets keep the channels from lining up at the origin.
				const r = fbm(nr, u, v, OCTAVES);
				const g = fbm(ng, u + 31.4, v + 15.9, OCTAVES);
				const b = fbm(nb, u + 71.8, v + 28.1, OCTAVES);
				const i = (y * W + x) * 4;
				// -1…1 → 0…255, then pushed toward the middle a touch so the field
				// reads as muted color rather than blown-out primaries.
				d[i] = 128 + r * 118;
				d[i + 1] = 128 + g * 118;
				d[i + 2] = 128 + b * 118;
				d[i + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);
	}

	$effect(() => {
		// Re-runs when `seed` changes (debug reroll).
		seed;
		paint();
	});

	/** @param {number} i */
	function choose(i) {
		picked = i;
		setTimeout(() => onAnswer(options[i].score), 520);
	}
</script>

<div class="noise-q">
	<h2>{prompt}</h2>
	<hr class="rule" />

	<div class="plate">
		<canvas bind:this={canvas} width={W} height={H} aria-label="An abstract field of colored noise"
		></canvas>
	</div>

	{#if import.meta.env.DEV}
		<div class="debug">
			<button onclick={() => (seed = Math.floor(Math.random() * 1e9))}>reroll noise</button>
			<span>seed {seed}</span>
		</div>
	{/if}

	<div class="choices">
		{#each options as opt, i}
			<button
				class="card"
				class:picked={picked === i}
				style="--i: {i}"
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
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.noise-q > hr {
		margin: 0 0 1.5rem;
	}
	.plate {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		margin-bottom: 1.75rem;
		animation: rise 0.5s 0.15s both;
	}
	canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 240 / 150;
	}
	.debug {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: -1.25rem 0 1.25rem;
		font-size: 0.75rem;
		color: var(--muted);
	}
	.debug button {
		font: inherit;
		padding: 0.25rem 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		color: inherit;
	}
	.choices {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	.card {
		padding: 1.15rem 1.25rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		color: inherit;
		font-weight: 500;
		font-size: 1.05rem;
		animation: rise 0.45s calc(0.3s + var(--i) * 80ms) both;
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
	@media (max-width: 520px) {
		.choices {
			grid-template-columns: 1fr;
		}
	}
</style>
