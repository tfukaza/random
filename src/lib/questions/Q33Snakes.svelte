<script>
	// Q33 — the "rotating snakes" peripheral-drift illusion (Kitaoka), rebuilt
	// in pure CSS and full monochrome: concentric rings of stepped luminance
	// segments (black → dark → white → light) that peripheral vision misreads
	// as rotation, with adjacent rings reversed so they seem to counter-rotate.
	// The trap: unlike the textbook version, these discs genuinely ARE rotating —
	// but only in bursts. Once every three seconds each disc turns 10° over a
	// single second (a true 10°/s creep), then holds perfectly still. Anyone who
	// recognises the famous illusion will smugly answer "they're not moving" and
	// be wrong, and the four numeric options force a commitment to both a RATE
	// and a PATTERN. "10° a second, but only occasionally" is right about each.
	import PickList from './PickList.svelte';
	import { sharpenAgainstDetailClaim } from './detailClaim.js';
	let { onAnswer } = $props();

	// Post-answer reveal (same mechanic family as Q22): once an option is
	// picked, every disc but the center one fades away, a red needle pokes out
	// of the survivor disc, and a red contrail arc accumulates behind the needle's
	// tip as it turns — the 6.2s reveal spans two full creep-and-hold cycles, so
	// the taker watches it happen twice — before the quiz moves on.
	let revealed = $state(false);
	/** @type {HTMLElement[]} */
	let spinEls = $state([]);
	let trailA0 = $state(0);
	let trailSweep = $state(0);
	/** @type {number} */
	let rafId;

	/** @param {HTMLElement} el */
	function readAngle(el) {
		const r = getComputedStyle(el).rotate;
		return r === 'none' ? 0 : parseFloat(r);
	}

	// Both 10° answers count as having seen the motion — they got the rate right
	// and at worst the pattern wrong, and the fully-correct one already scores
	// better on its own merits. A miss is underestimating tenfold or, worst,
	// declaring a visibly turning disc to be stationary.
	const DETECTED = new Set([2, 3]);
	let pickedIndex = -1;

	/** @param {Record<string, number>} score */
	function handleAnswer(score) {
		// Collect on the detail claim before the reveal starts, then hand the
		// adjusted delta to onAnswer 6.2s later along with everything else.
		score = sharpenAgainstDetailClaim(score, !DETECTED.has(pickedIndex));
		revealed = true;
		const spin = spinEls[4];
		if (spin) {
			// Sample the center disc's live animated angle every frame; the
			// contrail is drawn from the angle at reveal time to wherever the
			// needle is now, so it stays exactly in step with the CSS animation.
			trailA0 = readAngle(spin);
			const tick = () => {
				trailSweep = readAngle(spin) - trailA0;
				rafId = requestAnimationFrame(tick);
			};
			tick();
		}
		setTimeout(() => {
			cancelAnimationFrame(rafId);
			onAnswer(score);
		}, 6200);
	}

	$effect(() => () => cancelAnimationFrame(rafId));

	const prompt = 'Look at the figure for a few seconds. How fast would you estimate it is moving?';
	const options = [
		{ label: '1° per second', score: { scope: 1 } },
		// Right about the burst, wrong about the rate by a factor of ten.
		{ label: '1° a second, but only occasionally', score: { scope: -1 } },
		// Right about the rate, wrong about the burst.
		{ label: '10° per second', score: { scope: -1 } },
		// The truth, and absurdly precise about it.
		{ label: '10° a second, but only occasionally', score: { scope: -3 } },
		// The smug illusion-spotter, pattern-matching the famous poster instead
		// of looking at what is in front of them.
		{ label: 'They’re not moving', score: { risk: -1, scope: 2 } }
	];

	// Per-disc phase offsets so the nine discs don't read as copy-pasted.
	const discs = Array.from({ length: 9 }, (_, i) => ({
		phase: (i * 47) % 360,
		// Alternate which direction the outermost ring drifts, checkerboard-style.
		flip: (Math.floor(i / 3) + i) % 2 === 1,
		// Negative animation-delay staggers each disc's creep across the 3s
		// cycle, in a scrambled order, so the motion ripples irregularly instead
		// of all nine discs nudging in lockstep.
		stagger: -(((i * 5) % 9) * 0.33)
	}));

	// Piecewise-linear easing for the creep-and-hold motion, as ONE animation:
	// each 3s cycle ramps 10° during its first second (a true 10°/s creep) and
	// holds for the remaining 2s. A single animation keeps the accumulated angle
	// continuous by construction — an earlier version layered two synced
	// animations, which could land a frame apart at the cycle boundary and flash
	// a visible jolt.
	//
	// The two magic numbers are both load-bearing:
	//
	//   600° total — a multiple of 24°, one period of the ring pattern, so the
	//   wrap back to 0° is invisible.
	//
	//   60 cycles × 3s = 180s — the reveal samples the live computed angle every
	//   frame (see readAngle) and draws the contrail from wherever the needle was
	//   at reveal time, which only works while that angle grows monotonically. A
	//   short loop would reset mid-reveal and collapse the trail, so the wrap is
	//   pushed out to once every three minutes, far outside any plausible time
	//   spent on this question.
	const CYCLES = 60;
	// Each burst EASES IN AND OUT rather than snapping into motion and stopping
	// dead. `linear()` only interpolates straight lines between its stops, so the
	// curve is drawn explicitly: STEPS points per burst following a raised
	// cosine, which leaves and arrives at zero velocity.
	//
	// Consequence worth knowing — the burst still covers 10° in 1s, so the
	// AVERAGE is still 10°/s and "10° a second, but only occasionally" is still
	// the right answer. But the instantaneous PEAK is now ~15.7°/s (π/2 × the
	// average, at the midpoint of each burst). Flattening the curve further would
	// lower the peak; removing it entirely brings back the snap.
	const STEPS = 8;
	const MOVE = 1 / 3; // 1s of motion per 3s cycle
	const ease = (() => {
		const stops = ['0'];
		for (let i = 0; i < CYCLES; i++) {
			for (let k = 1; k <= STEPS; k++) {
				const p = k / STEPS;
				// Raised cosine: 0 → 1, with zero slope at both ends.
				const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
				const value = ((i + eased) / CYCLES).toFixed(5);
				const at = (((i + MOVE * p) / CYCLES) * 100).toFixed(3);
				stops.push(`${value} ${at}%`);
			}
			// …then hold this cycle's angle for the remaining two thirds.
			stops.push(`${((i + 1) / CYCLES).toFixed(5)} ${(((i + 1) / CYCLES) * 100).toFixed(3)}%`);
		}
		return `linear(${stops.join(', ')})`;
	})();
</script>

<PickList {prompt} {options} onAnswer={handleAnswer} onPick={(/** @type {number} */ i) => (pickedIndex = i)}>
	<div class="illusion">
		<div
			class="board"
			class:revealed
			role="img"
			aria-label="Nine circles patterned like dartboards, rotating in slow bursts"
			style="--ease: {ease}"
		>
			{#each discs as d, i}
				<div
					class="disc"
					class:flip={d.flip}
					class:center={i === 4}
					style="--phase: {d.phase}deg; --stagger: {d.stagger}s"
				>
					<div class="spin" bind:this={spinEls[i]}>
						<div class="ring r1"></div>
						<div class="ring r2"></div>
						<div class="ring r3"></div>
						<div class="core"></div>
						{#if i === 4}
							<div class="needle"></div>
						{/if}
					</div>
					{#if i === 4}
						<div
							class="trail"
							style="--a0: {trailA0 + Math.min(trailSweep, 0)}deg; --sweep: {Math.abs(
								trailSweep
							)}deg"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</PickList>

<style>
	.illusion {
		margin: 0 0 1.75rem;
		animation: rise 0.5s both;
	}
	.board {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
		max-width: 480px;
		margin: 0 auto;
	}
	.disc {
		position: relative;
		aspect-ratio: 1;
		--dir: 1;
	}
	.disc.flip {
		--dir: -1;
	}
	/* The rotation lives on this inner wrapper (not .disc) so the reveal's
	   contrail overlay can sit around the disc without turning with it.
	   180s = 60 creep-and-hold cycles of 3s; --ease (built in the script) shapes
	   each cycle into a 1s x 10°/s glide followed by a 2s hold, covering 600° in
	   total. See the note in the script for why both numbers are what they are. */
	.spin {
		position: absolute;
		inset: 0;
		animation: turn 180s var(--ease, linear) infinite;
		animation-delay: var(--stagger, 0s);
	}
	@keyframes turn {
		to {
			rotate: calc(var(--dir, 1) * 600deg);
		}
	}
	/* Post-answer reveal: only the center disc survives, and its red needle
	   makes the rotation impossible to write off as the illusion. */
	.disc {
		transition: opacity 0.6s ease;
	}
	.revealed .disc:not(.center) {
		opacity: 0;
	}
	.needle {
		position: absolute;
		left: calc(50% - 1.5px);
		bottom: 50%;
		width: 3px;
		height: 80%;
		background: #b0271d;
		opacity: 0;
		transition: opacity 0.45s ease 0.4s;
		pointer-events: none;
	}
	.revealed .needle {
		opacity: 1;
	}
	/* Contrail: a static overlay ring just past the needle's tip. The script
	   feeds it --a0/--sweep from the live animated angle, so a red arc grows
	   behind the needle exactly as far as the disc has actually turned. A
	   conic-gradient, so any sweep up to a full 360° renders correctly. */
	.trail {
		position: absolute;
		inset: -35%;
		border-radius: 50%;
		background: conic-gradient(
			from var(--a0, 0deg),
			rgba(176, 39, 29, 0.5) 0 var(--sweep, 0deg),
			transparent var(--sweep, 0deg)
		);
		-webkit-mask: radial-gradient(closest-side, transparent 0 86%, #000 87% 94%, transparent 95%);
		mask: radial-gradient(closest-side, transparent 0 86%, #000 87% 94%, transparent 95%);
		opacity: 0;
		transition: opacity 0.45s ease 0.4s;
		pointer-events: none;
	}
	.revealed .trail {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
		}
	}

	/* Each ring is a full circle; the smaller ring stacked on top covers its
	   middle, so only an annulus of each pattern stays visible. The stepped
	   luminance staircase (black → dark → white → light, 5° per step) is what
	   drives the drift; reversing dark and light reverses the drift direction. */
	.ring,
	.core {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		border-radius: 50%;
	}
	.r1 {
		width: 100%;
		height: 100%;
		background: repeating-conic-gradient(
			from var(--phase),
			#1b1b19 0 6deg,
			#878785 0 12deg,
			#fdfdfc 0 18deg,
			#c8c8c6 0 24deg
		);
	}
	.r2 {
		width: 70%;
		height: 70%;
		background: repeating-conic-gradient(
			from calc(var(--phase) + 12deg),
			#1b1b19 0 6deg,
			#c8c8c6 0 12deg,
			#fdfdfc 0 18deg,
			#878785 0 24deg
		);
	}
	.r3 {
		width: 44%;
		height: 44%;
		background: repeating-conic-gradient(
			from calc(var(--phase) + 6deg),
			#1b1b19 0 6deg,
			#878785 0 12deg,
			#fdfdfc 0 18deg,
			#c8c8c6 0 24deg
		);
	}
	/* Flipped discs swap every ring's direction so neighbors counter-rotate. */
	.flip .r1,
	.flip .r3 {
		background: repeating-conic-gradient(
			from var(--phase),
			#1b1b19 0 6deg,
			#c8c8c6 0 12deg,
			#fdfdfc 0 18deg,
			#878785 0 24deg
		);
	}
	.flip .r2 {
		background: repeating-conic-gradient(
			from calc(var(--phase) + 12deg),
			#1b1b19 0 6deg,
			#878785 0 12deg,
			#fdfdfc 0 18deg,
			#c8c8c6 0 24deg
		);
	}
	/* Thin paper-colored gaps between rings — the "dartboard" separation that
	   keeps each annulus reading as its own band (and its own drift direction). */
	.r2,
	.r3,
	.core {
		box-shadow: 0 0 0 3px var(--surface);
	}
	.core {
		width: 20%;
		height: 20%;
		background: #8b8b89;
	}

	@media (max-width: 560px) {
		.board {
			gap: 0.45rem;
		}
	}
</style>
