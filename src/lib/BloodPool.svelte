<script>
	// A pool spreading out from underneath the stack of paper, after the taker
	// stashes a weapon under it in Q53.
	//
	// The whole point is that it is NOT on the card — it is on the desk, under
	// the papers. So this is mounted as the FIRST child of `.stage`, before the
	// sheets and the frame, which paint over it: the card's opaque background
	// hides the middle of the pool, and only the part that has spread past the
	// edges of the stack is visible. That is what sells "it's coming from under
	// there" rather than "it's drawn on top".
	//
	// Quiz-phase chrome like TemperamentHud, mounted OUTSIDE the {#key index}
	// block so its wall-clock arc survives every question change.
	import { stash } from './questions/stashState.svelte.js';

	const FULL = 90_000;

	// app.css kills CSS animation *durations* globally under reduced motion, which
	// would leave any infinite animation running at 0.01ms per cycle — a strobe.
	// So reduced motion is gated in markup: no ticker, no animation, just the
	// terminal state.
	const reduced =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** @type {HTMLElement | undefined} */
	let host = $state();
	let w = $state(0);
	let h = $state(0);
	let elapsed = $state(reduced ? FULL : 0);

	/** Seeded so the pool's shape is stable across resizes. @param {number} s */
	function mulberry32(s) {
		let a = s >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const seed = Math.floor(Math.random() * 1e9);

	/**
	 * A closed organic blob: radius modulated by three out-of-phase sines so the
	 * outline lobes irregularly instead of reading as an ellipse, then smoothed
	 * with Catmull-Rom-style cubics so there are no corners.
	 * @param {number} cx @param {number} cy @param {number} rx @param {number} ry
	 * @param {() => number} rnd
	 */
	function blob(cx, cy, rx, ry, rnd) {
		const k = [
			{ n: 2 + Math.floor(rnd() * 2), a: 0.1 + rnd() * 0.09, p: rnd() * 6.283 },
			{ n: 3 + Math.floor(rnd() * 3), a: 0.05 + rnd() * 0.06, p: rnd() * 6.283 },
			{ n: 6 + Math.floor(rnd() * 4), a: 0.02 + rnd() * 0.03, p: rnd() * 6.283 }
		];
		const N = 44;
		/** @type {{x: number, y: number}[]} */
		const pts = [];
		for (let i = 0; i < N; i++) {
			const th = (i / N) * Math.PI * 2;
			let m = 1;
			for (const s of k) m += s.a * Math.sin(s.n * th + s.p);
			pts.push({ x: cx + Math.cos(th) * rx * m, y: cy + Math.sin(th) * ry * m });
		}
		// Closed Catmull-Rom → cubic Bézier. Wrapping the index makes the seam
		// between last and first point as smooth as every other joint.
		const at = (/** @type {number} */ i) => pts[(i + N) % N];
		let d = `M ${at(0).x.toFixed(1)} ${at(0).y.toFixed(1)}`;
		for (let i = 0; i < N; i++) {
			const p0 = at(i - 1);
			const p1 = at(i);
			const p2 = at(i + 1);
			const p3 = at(i + 2);
			d +=
				` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)},` +
				` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)},` +
				` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
		}
		return d + ' Z';
	}

	// The SVG box is deliberately larger than the stage so the pool can spread
	// well past the paper on all sides. Stage occupies x ∈ [w/2, 3w/2], y ∈ [0, h].
	const VW = $derived(w * 2);
	const VH = $derived(h * 1.45);

	// Derives on w/h ONLY — regenerating per tick would make the outline boil.
	const shape = $derived.by(() => {
		if (!w || !h) return null;
		const rnd = mulberry32(seed);
		// Centred a little above the bottom edge, so at small scale the pool is
		// still entirely hidden under the stack and has to grow to be seen.
		const cx = w;
		const cy = h * 0.9;
		// One pool only — the irregular outline does the work, a second overlapping
		// lobe just read as two puddles.
		const main = blob(cx, cy, w * 0.42, h * 0.17, rnd);
		const spots = Array.from({ length: 5 }, () => {
			const a = rnd() * Math.PI * 2;
			const dist = 0.5 + rnd() * 0.55;
			return {
				d: blob(
					cx + Math.cos(a) * w * 0.5 * dist,
					cy + Math.abs(Math.sin(a)) * h * 0.22 * dist,
					w * (0.012 + rnd() * 0.03),
					h * (0.006 + rnd() * 0.015),
					rnd
				),
				delay: 0.35 + rnd() * 0.5
			};
		});
		return { main, spots, cx, cy };
	});

	/** Piecewise-linear ramp. @param {number} t @param {[number, number][]} stops */
	function ramp(t, stops) {
		if (t <= stops[0][0]) return stops[0][1];
		for (let i = 0; i < stops.length - 1; i++) {
			const [t0, v0] = stops[i];
			const [t1, v1] = stops[i + 1];
			if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
		}
		return stops[stops.length - 1][1];
	}

	const secs = $derived(elapsed / 1000);
	// A pool this size clears the bottom edge of the stack at about grow 0.53, so
	// the arc STARTS just past that: a sliver is already showing the instant the
	// weapon goes under, and it keeps widening from there. Starting below the
	// threshold meant ~20 seconds of nothing, which read as the choice having had
	// no effect at all.
	const grow = $derived(
		ramp(secs, [
			[0, 0.58],
			[1.5, 0.67],
			[6, 0.77],
			[18, 0.89],
			[45, 1.03],
			[90, 1.25]
		])
	);
	const alpha = $derived(
		ramp(secs, [
			[0, 0.3],
			[1.2, 0.72],
			[8, 0.85],
			[90, 0.9]
		])
	);
	const spotsIn = $derived(ramp(secs, [[10, 0], [26, 1]]));

	// Coarse ticker: JS writes custom properties, CSS transitions (longer than the
	// tick) do the interpolation. Stops for good once the arc completes.
	$effect(() => {
		if (reduced) return;
		const t0 = stash.hiddenAt;
		if (t0 === null) return;
		elapsed = performance.now() - t0;
		const id = setInterval(() => {
			elapsed = performance.now() - t0;
			if (elapsed >= FULL) clearInterval(id);
		}, 250);
		return () => clearInterval(id);
	});

	// Measure the stage in CSS pixels so 1 viewBox unit === 1px: uniform scale,
	// and all the geometry above is tunable in real pixels.
	$effect(() => {
		const stage = host?.parentElement;
		if (!stage) return;
		const ro = new ResizeObserver(([e]) => {
			w = Math.round(e.contentRect.width);
			h = Math.round(e.contentRect.height);
		});
		ro.observe(stage);
		return () => ro.disconnect();
	});
</script>

<div class="pool" bind:this={host} aria-hidden="true">
	{#if shape}
		<svg
			viewBox="0 0 {VW} {VH}"
			style="--grow: {grow}; --alpha: {alpha}; --spots: {spotsIn}; --ox: {shape.cx}px; --oy: {shape.cy}px"
			class:reduced
		>
			<defs>
				<!-- <defs> ids are global; prefix everything. -->
				<filter id="bloodpool-edge" x="-20%" y="-20%" width="140%" height="140%">
					<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="11" result="n" />
					<feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
				</filter>
				<radialGradient id="bloodpool-sheen" cx="0.42" cy="0.34" r="0.5">
					<stop offset="0" stop-color="#b31c20" stop-opacity="0.55" />
					<stop offset="1" stop-color="#b31c20" stop-opacity="0" />
				</radialGradient>
			</defs>

			<g class="spread" filter="url(#bloodpool-edge)">
				<path class="body" d={shape.main} />
				<!-- A wet highlight, so it reads as liquid rather than as a flat decal. -->
				<path class="sheen" d={shape.main} />
				<g class="spots">
					{#each shape.spots as s}
						<path class="body" d={s.d} style="--d: {s.delay}" />
					{/each}
				</g>
			</g>
		</svg>
	{/if}
</div>

{#if import.meta.env.DEV}
	<aside class="pool-debug">
		<p class="pd-title">🩸 pool · dev only</p>
		<p class="pd-note">t = {(elapsed / 1000).toFixed(1)}s</p>
		<div class="pd-row">
			{#each [['0', 0], ['10', 10], ['26', 26], ['50', 50], ['92', 92]] as [label, at]}
				<button onclick={() => (stash.hiddenAt = performance.now() - Number(at) * 1000)}>
					{label}
				</button>
			{/each}
		</div>
	</aside>
{/if}

<style>
	/* First child of .stage, so the sheets and the certificate paint over it and
	   only the spread beyond the paper shows. */
	.pool {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	svg {
		position: absolute;
		/* Deliberately larger than the stage: the pool has to be able to spread
		   past the paper on every side. */
		left: -50%;
		top: 0;
		width: 200%;
		height: 145%;
		overflow: visible;
		opacity: var(--alpha);
		transition: opacity 0.5s linear;
	}
	svg.reduced {
		transition: none;
	}
	.spread {
		transform: scale(var(--grow));
		/* Grow outward from the pool's own centre, under the stack. Without
		   `transform-box: fill-box` the origin resolves against the whole SVG
		   viewport and the pool slides sideways as it grows. */
		transform-box: fill-box;
		transform-origin: center;
		transition: transform 0.42s linear;
	}
	svg.reduced .spread {
		transition: none;
	}
	.body {
		fill: #7d0f13;
	}
	.sheen {
		fill: url(#bloodpool-sheen);
	}
	.spots {
		opacity: var(--spots);
		transition: opacity 0.6s linear;
	}

	.pool-debug {
		position: fixed;
		left: 1rem;
		bottom: 1rem;
		z-index: 60;
		width: 12rem;
		padding: 0.7rem;
		background: #fff;
		color: #111;
		border: 1px solid #d4d4d4;
		border-radius: 0.6rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		font-family: system-ui, sans-serif;
		font-size: 0.75rem;
	}
	.pd-title {
		margin: 0 0 0.3rem;
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.65rem;
		color: #666;
	}
	.pd-note {
		margin: 0 0 0.4rem;
		color: #666;
		font-variant-numeric: tabular-nums;
	}
	.pd-row {
		display: flex;
		gap: 0.25rem;
	}
	.pd-row button {
		flex: 1;
		font: inherit;
		font-size: 0.68rem;
		padding: 0.2rem 0.3rem;
		border: 1px solid #ccc;
		border-radius: 0.3rem;
		background: #fff;
		cursor: pointer;
	}
</style>
