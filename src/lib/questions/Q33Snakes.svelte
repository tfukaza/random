<script>
	// Q33 — the "rotating snakes" peripheral-drift illusion (Kitaoka), rebuilt
	// in pure CSS and full monochrome: concentric rings of stepped luminance
	// segments (black → dark → white → light) that peripheral vision misreads
	// as rotation, with adjacent rings reversed so they seem to counter-rotate.
	// The trap: unlike the textbook version, these discs genuinely ARE rotating
	// — but only occasionally. Every 4 seconds each disc creeps 1° over one
	// second (a true 1°/s motion), then holds still. Anyone who recognizes the
	// famous illusion will smugly answer "not moving" and be wrong; "1° a
	// second, but only occasionally" is the absurdly precise correct answer.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	// Post-answer reveal (same mechanic family as Q22): once an option is
	// picked, every disc but the center one fades away, a red needle pokes out
	// of the survivor, and a red contrail arc accumulates behind the needle's
	// tip as it creeps — making the genuine rotation undeniable — before the
	// quiz moves on.
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

	/** @param {Record<string, number>} score */
	function handleAnswer(score) {
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
		{ label: 'Not moving at all', score: { risk: -1, scope: -1 } },
		{ label: '1° per second', score: { scope: -2 } },
		// watching closely enough to catch the creep is peak detail-orientation
		{ label: '1° a second, but only occasionally', score: { scope: -3 } },
		{ label: '2° per second', score: { scope: 1 } },
		{ label: '4° per second', score: { creative: 1, scope: 1 } },
		{ label: '16° per second', score: { scope: 2, risk: 1 } }
	];

	// Per-disc phase offsets so the nine discs don't read as copy-pasted.
	const discs = Array.from({ length: 9 }, (_, i) => ({
		phase: (i * 47) % 360,
		// Alternate which direction the outermost ring drifts, checkerboard-style.
		flip: (Math.floor(i / 3) + i) % 2 === 1,
		// Negative animation-delay staggers each disc's creep across the 3s
		// cycle, in a scrambled order so the motion ripples irregularly instead
		// of all nine discs nudging in lockstep.
		stagger: -(((i * 5) % 9) * 0.33)
	}));

	// Piecewise-linear easing for the creep-and-hold motion, as one animation:
	// each 3s cycle ramps 1° during its first second (a true 1°/s creep) and
	// holds for the remaining 2s — so the 6-second reveal always catches the
	// disc moving. A single animation keeps the accumulated angle continuous
	// by construction — the previous version layered two synced animations (a
	// steps() accumulator + a smooth nudge), which could land a frame apart at
	// the cycle boundary and flash a visible 1° jolt. The loop spans 24 cycles
	// = 24°, exactly one period of the 24°-repeating ring pattern, so wrapping
	// back to 0° is invisible too.
	const CYCLES = 24;
	const ease = (() => {
		const stops = ['0'];
		for (let i = 0; i < CYCLES; i++) {
			const v = ((i + 1) / CYCLES).toFixed(5);
			stops.push(`${v} ${(((i + 1 / 3) / CYCLES) * 100).toFixed(3)}%`);
			stops.push(`${v} ${(((i + 1) / CYCLES) * 100).toFixed(3)}%`);
		}
		return `linear(${stops.join(', ')})`;
	})();
</script>

<PickList {prompt} {options} onAnswer={handleAnswer}>
	<div class="illusion">
		<div
			class="board"
			class:revealed
			role="img"
			aria-label="Nine circles patterned like dartboards, rotating very slowly"
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
	   72s = 24 creep-and-hold cycles of 3s; --ease (built in the script)
	   shapes each cycle into a 1s × 1°/s glide followed by a 2s hold. The
	   whole loop covers 24° — one period of the ring pattern — so the wrap
	   back to 0° never shows. */
	.spin {
		position: absolute;
		inset: 0;
		animation: turn 72s var(--ease, linear) infinite;
		animation-delay: var(--stagger, 0s);
	}
	@keyframes turn {
		to {
			rotate: calc(var(--dir, 1) * 24deg);
		}
	}
	/* Post-answer reveal: only the center disc survives, and its red needle
	   turns the imperceptible creep into something you can watch happen. */
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
	   behind the needle exactly as far as the disc has actually turned. */
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
