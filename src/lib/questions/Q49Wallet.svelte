<script>
	// Q49 — a found wallet, and a slider for how much of the cash you keep. The
	// premise stacks up reasons the owner won't miss it, which is the joke: the
	// question is doing the rationalising for you.
	//
	// The gag is the picture. $500 is drawn as 20 dollar signs sitting on the
	// wallet, and every notch of the slider ($25) migrates exactly one of them
	// across to the little figure labelled "You". Slide all the way and the
	// wallet is bare.
	import SliderPick from './SliderPick.svelte';
	import { ledger } from './ledger.svelte.js';

	let { onAnswer } = $props();

	const TOTAL = 500;
	const PER_SIGN = 25; // 20 signs, and one slider notch moves exactly one
	const SIGNS = TOTAL / PER_SIGN;

	// Where each pile sits, as a percentage across the picture.
	const WALLET_X = 22;
	const YOU_X = 78;

	// Fixed positions, one per sign, so a sign lands in the same spot every time —
	// no reshuffling as you drag. Laid out on a golden-angle (phyllotaxis) spiral
	// rather than random scatter: 20 points spread evenly with no clumping, which
	// a hash-based scatter can't promise. Squashed vertically to fit the strip,
	// and each sign is tilted a little so the heap doesn't look plotted.
	const SCATTER = Array.from({ length: SIGNS }, (_, i) => {
		const angle = i * 2.39996; // golden angle in radians
		// The +3 leaves a hole in the middle of the spiral, so the pile haloes the
		// icon rather than sitting on top of it.
		const r = 16 * Math.sqrt(i + 3);
		const jitter = Math.sin(i * 12.9898) * 43758.5453;
		return {
			x: Math.cos(angle) * r,
			y: Math.sin(angle) * r * 0.58,
			tilt: (jitter - Math.floor(jitter) - 0.5) * 26
		};
	});

	/** @param {number} value @returns {Record<string, number>} */
	function toScore(value) {
		const share = value / TOTAL;
		/** @type {Record<string, number>} */
		const delta =
			share === 0
				? { honesty: 3, risk: -1 }
				: share >= 1
					? { honesty: -3, risk: 3 }
					: share >= 0.5
						? { honesty: -2, risk: 2 }
						: { honesty: -1, risk: 1 };
		// The double-lie check: Q48 asked, in so many words, whether they would
		// do this. Claiming 6–7 honesty and then pocketing half the cash costs
		// extra; claiming 1–2 and returning every dollar earns it back.
		const claim = ledger.answers.q48?.value;
		if (typeof claim === 'number') {
			if (claim >= 6 && share >= 0.5) delta.honesty -= 3;
			else if (claim <= 2 && share === 0) delta.honesty += 2;
		}
		return delta;
	}
</script>

<SliderPick
	premise={'You find a wallet on the pavement. You open it to see who dropped it: an Equinox membership card, and a key card for the luxury condo building down the street. Whoever lost this is doing fine. There is $500 in cash inside.'}
	prompt="How much do you pocket?"
	min={0}
	max={TOTAL}
	step={PER_SIGN}
	leftLabel="$0 — hand it back untouched"
	rightLabel="$500 — all of it"
	format={(v) => `$${v}`}
	{toScore}
	{onAnswer}
>
	{#snippet children(value)}
		{@const taken = Math.round(value / PER_SIGN)}
		<div class="scene" aria-hidden="true">
			<div class="spot" style="left: {WALLET_X}%">
				<svg class="icon" viewBox="0 0 64 48">
					<rect x="2" y="8" width="60" height="38" rx="5" />
					<path d="M2 16h44a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H2" />
					<circle class="stud" cx="46" cy="24" r="2.6" />
					<path class="flap" d="M10 8V6a4 4 0 0 1 4-4h30a4 4 0 0 1 4 4v2" />
				</svg>
			</div>

			<div class="spot" style="left: {YOU_X}%">
				<svg class="icon" viewBox="0 0 64 48">
					<circle cx="32" cy="13" r="9" />
					<path d="M12 46c0-11 9-18 20-18s20 7 20 18" />
				</svg>
				<span class="tag">You</span>
			</div>

			<!-- One span per $25. Its x is the only thing that changes, so the
			     signs visibly travel from the wallet to you as you drag. -->
			{#each SCATTER as s, i}
				<span
					class="buck"
					class:taken={i < taken}
					style="left: {i < taken ? YOU_X : WALLET_X}%; --dx: {s.x}px; --dy: {s.y}px; --tilt: {s.tilt}deg; --d: {(i %
						6) *
						25}ms"
				>
					$
				</span>
			{/each}
		</div>
	{/snippet}
</SliderPick>

<style>
	.scene {
		position: relative;
		height: 11rem;
		margin: 0 0 1.75rem;
		animation: rise 0.45s 0.25s both;
	}
	/* Icons sit above the money, so a full pile haloes the figure instead of
	   burying it — at $500 every sign is on this side. */
	.spot {
		position: absolute;
		top: 50%;
		z-index: 1;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.icon {
		width: 4.25rem;
		height: auto;
		fill: none;
		stroke: var(--ink);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon .stud {
		fill: var(--ink);
		stroke: none;
	}
	.icon .flap {
		stroke-dasharray: 3 4;
	}
	.tag {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
		/* Sits inside the pile, so it needs to punch a clean hole in it. */
		background: var(--surface);
		padding: 0.1rem 0.35rem;
	}
	/* Each sign is placed at a pile's x, then offset by its own fixed scatter, so
	   the two heaps look hand-tossed. Only `left` animates. */
	.buck {
		position: absolute;
		top: 50%;
		z-index: 0;
		transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--tilt));
		font-family: 'Lora', Georgia, serif;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--ink);
		/* A paper-coloured halo so overlapping signs — and the icon lines behind
		   them — stay legible where the pile is dense. */
		text-shadow:
			0 0 3px var(--surface),
			0 0 3px var(--surface),
			0 0 3px var(--surface);
		pointer-events: none;
		transition: left 0.45s cubic-bezier(0.33, 1, 0.68, 1);
		transition-delay: var(--d);
	}
	/* Pocketed ones ride slightly smaller and lighter — they're "spent". */
	.buck.taken {
		font-size: 1rem;
	}
	@media (max-width: 520px) {
		.scene {
			height: 8rem;
		}
		.icon {
			width: 3.4rem;
		}
		.buck {
			font-size: 0.95rem;
		}
	}
</style>
