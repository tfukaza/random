<script>
	// Q33 — the "rotating snakes" peripheral-drift illusion (Kitaoka), rebuilt
	// in pure CSS and full monochrome: concentric rings of stepped luminance
	// segments (black → dark → white → light) that peripheral vision misreads
	// as rotation, with adjacent rings reversed so they seem to counter-rotate.
	// The trap: unlike the textbook version, these discs genuinely ARE rotating —
	// but only in bursts. One disc at a time turns up to 3° over a single second,
	// with subtler rates for takers who made the strongest detail claims, then
	// the board holds before a non-adjacent disc takes the next turn. Anyone who
	// recognises the famous illusion will smugly answer "they're not moving" and
	// be wrong. The two moving options use the exact authored rate, forcing a
	// commitment to whether that movement is continuous or occasional.
	import { onMount, tick } from 'svelte';
	import PickList from './PickList.svelte';
	import { latestResponse } from './metrics.svelte.js';
	import { sharpenAgainstDetailClaim } from './detailClaim.js';
	import {
		areAdjacentCircles,
		nextEligibleCircle,
		rotationRateForDetail
	} from './q33SnakesModel.js';
	let { onAnswer } = $props();

	// Post-answer reveal (same mechanic family as Q22): once an option is
	// picked, every disc but one inner disc fades away, a red needle pokes out
	// of the survivor disc, and a red contrail arc accumulates behind the needle's
	// tip as it turns. During the 6.2s reveal, short featured-disc bursts alternate with
	// safely distant hidden corners so the taker watches the proof several times.
	let revealed = $state(false);
	/** @type {HTMLElement[]} */
	let spinEls = $state([]);
	let trailA0 = $state(0);
	let trailSweep = $state(0);
	let angles = $state(Array(16).fill(0));
	/** @type {number} */
	let rafId;
	/** @type {number | undefined} */
	let burstTimer;
	/** @type {Animation | null} */
	let activeAnimation = null;
	let lastRotated = /** @type {number | null} */ (null);
	let activeIndex = /** @type {number | null} */ (null);
	let hoveredIndex = $state(/** @type {number | null} */ (null));
	let selectedIndices = $state(new Set());
	let revealCorner = 0;
	let stopped = false;

	const detailLevel = latestResponse('detail-claim')?.value;
	const BURST_DEGREES = rotationRateForDetail(detailLevel);
	const BURST_MS = 1000;
	const HOLD_MS = 2000;
	const REVEAL_HOLD_MS = 250;
	const FEATURED_INDEX = 5;
	const CORNERS = [0, 3, 12, 15];

	/** @param {HTMLElement} el */
	function readAngle(el) {
		const r = getComputedStyle(el).rotate;
		return r === 'none' ? 0 : parseFloat(r);
	}

	// Both moving answers count as having seen the motion — they got the rate right
	// and at worst the pattern wrong, and the fully-correct one already scores
	// better on its own merits. A miss is substantially underestimating or, worst,
	// declaring a visibly turning disc to be stationary.
	const DETECTED = new Set([0, 1]);
	let pickedIndex = -1;

	/** @param {Record<string, number>} score */
	function handleAnswer(score) {
		// Collect on the detail claim before the reveal starts, then hand the
		// adjusted delta to onAnswer 6.2s later along with everything else.
		score = sharpenAgainstDetailClaim(score, !DETECTED.has(pickedIndex));
		revealed = true;
		restartForReveal();
		const spin = spinEls[FEATURED_INDEX];
		if (spin) {
			// Sample the featured disc's live animated angle every frame; the
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

	/** @param {number | null} previous */
	function revealNext(previous) {
		// Alternate the visible featured disc with corners. If the last completed
		// disc was an edge neighbor of it, insert a safe corner first.
		const excluded = excludedIndices();
		if (
			!excluded.has(FEATURED_INDEX) &&
			previous !== FEATURED_INDEX &&
			previous !== null &&
			!areAdjacentCircles(previous, FEATURED_INDEX)
		) return FEATURED_INDEX;
		for (let n = 0; n < CORNERS.length; n += 1) {
			const candidate = CORNERS[(revealCorner + n) % CORNERS.length];
			if (
				!excluded.has(candidate) &&
				candidate !== previous &&
				!areAdjacentCircles(previous ?? -1, candidate)
			) {
				revealCorner = (revealCorner + n + 1) % CORNERS.length;
				return candidate;
			}
		}
		return nextEligibleCircle(previous, excluded);
	}

	function excludedIndices() {
		const excluded = new Set(selectedIndices);
		if (hoveredIndex !== null) excluded.add(hoveredIndex);
		return excluded;
	}

	/** @param {number} delay */
	function scheduleBurst(delay) {
		clearTimeout(burstTimer);
		burstTimer = window.setTimeout(startBurst, delay);
	}

	function startBurst() {
		if (stopped) return;
		const excluded = excludedIndices();
		const index = revealed
			? revealNext(lastRotated)
			: nextEligibleCircle(lastRotated, excluded);
		if (index < 0 || excluded.has(index)) {
			scheduleBurst(HOLD_MS);
			return;
		}
		const element = spinEls[index];
		if (!element || typeof element.animate !== 'function') {
			scheduleBurst(HOLD_MS);
			return;
		}
		const from = angles[index];
		const to = from + (discs[index].flip ? -BURST_DEGREES : BURST_DEGREES);
		const animation = element.animate(
			[{ rotate: `${from}deg` }, { rotate: `${to}deg` }],
			{ duration: BURST_MS, easing: 'ease-in-out', fill: 'forwards' }
		);
		activeAnimation = animation;
		activeIndex = index;
		animation.onfinish = async () => {
			if (stopped || activeAnimation !== animation) return;
			angles[index] = to;
			lastRotated = index;
			await tick();
			animation.cancel();
			activeAnimation = null;
			activeIndex = null;
			scheduleBurst(revealed ? REVEAL_HOLD_MS : HOLD_MS);
		};
	}

	function restartForReveal() {
		clearTimeout(burstTimer);
		activeAnimation?.cancel();
		activeAnimation = null;
		activeIndex = null;
		scheduleBurst(0);
	}

	/** @param {number} index */
	function excludeActive(index) {
		if (activeIndex !== index) return;
		activeAnimation?.cancel();
		activeAnimation = null;
		activeIndex = null;
		scheduleBurst(0);
	}

	/** @param {number} index */
	function hoverCircle(index) {
		hoveredIndex = index;
		excludeActive(index);
	}

	/** @param {number} index */
	function leaveCircle(index) {
		if (hoveredIndex === index) hoveredIndex = null;
	}

	/** @param {number} index */
	function toggleCircle(index) {
		const next = new Set(selectedIndices);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		selectedIndices = next;
		if (next.has(index)) excludeActive(index);
	}

	onMount(() => {
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) scheduleBurst(0);
		return () => {
			stopped = true;
			clearTimeout(burstTimer);
			activeAnimation?.cancel();
			cancelAnimationFrame(rafId);
		};
	});

	const prompt = 'Look at the figure for a few seconds. How fast would you estimate it is moving?';
	const options = [
		// Right about the rate, wrong about the burst.
		{ label: `${BURST_DEGREES}°/s`, score: { scope: -1 } },
		// The truth, and absurdly precise about it.
		{ label: `${BURST_DEGREES}°/s, but occasional`, score: { scope: -3 } },
		// The smug illusion-spotter, pattern-matching the famous poster instead
		// of looking at what is in front of them.
		{ label: 'Not moving', score: { risk: -1, scope: 2 } }
	];

	// Per-disc phase offsets so the sixteen discs don't read as copy-pasted.
	const discs = Array.from({ length: 16 }, (_, i) => ({
		phase: (i * 47) % 360,
		// Alternate which direction the outermost ring drifts, checkerboard-style.
		flip: (Math.floor(i / 4) + i) % 2 === 1,
	}));
</script>

<PickList {prompt} {options} onAnswer={handleAnswer} onPick={(/** @type {number} */ i) => (pickedIndex = i)}>
	<div class="illusion">
		<div
			class="board"
			class:revealed
			data-burst-degrees={BURST_DEGREES}
			role="img"
			aria-label="Sixteen circles patterned like dartboards, rotating in slow bursts"
		>
			{#each discs as d, i}
				<button
					type="button"
					class="disc"
					class:flip={d.flip}
					class:featured={i === FEATURED_INDEX}
					style="--phase: {d.phase}deg"
					data-sfx="none"
					aria-label="Circle {i + 1}"
					onpointerenter={() => hoverCircle(i)}
					onpointerleave={() => leaveCircle(i)}
					onclick={() => toggleCircle(i)}
				>
					<div class="spin" bind:this={spinEls[i]} style="rotate: {angles[i]}deg">
						<div class="ring r1"></div>
						<div class="ring r2"></div>
						<div class="ring r3"></div>
						<div class="core"></div>
						{#if i === FEATURED_INDEX}
							<div class="needle"></div>
						{/if}
					</div>
					{#if i === FEATURED_INDEX}
						<div
							class="trail"
							style="--a0: {trailA0 + Math.min(trailSweep, 0)}deg; --sweep: {Math.abs(
								trailSweep
							)}deg"
						></div>
					{/if}
				</button>
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
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		max-width: 520px;
		margin: 0 auto;
	}
	.disc {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		background: transparent;
		border: 0;
		color: inherit;
		--dir: 1;
	}
	.disc:focus-visible {
		outline: 1px solid var(--rule);
		outline-offset: 2px;
	}
	.disc.flip {
		--dir: -1;
	}
	/* One Web Animation at a time owns rotation on this inner wrapper. Keeping
	   the settled angle inline lets a finished burst hand off without a jump. */
	.spin {
		position: absolute;
		inset: 0;
	}
	/* Post-answer reveal: only the featured inner disc survives, and its red needle
	   makes the rotation impossible to write off as the illusion. */
	.disc {
		transition: opacity 0.6s ease;
	}
	.revealed .disc:not(.featured) {
		opacity: 0;
		pointer-events: none;
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
