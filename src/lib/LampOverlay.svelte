<script>
	// The room, after dark mode is submitted: a full-viewport canvas vignette.
	// The page has no dark theme — it is paper on a desk — so answering "dark
	// mode" darkens the ROOM, and a vintage table lamp above the stack's
	// top-right corner is the only light left. Per P6 nothing ever mentions it.
	//
	// Everything is driven by elapsed time since lamp.litAt, so remounts resume
	// mid-arc (the stash/coupon timestamp discipline). Timeline:
	//   A  0 → 1.2s   the lights go down: uniform darkness ramps in
	//   B  1.2 → 2.2s the lamp tries to catch: scripted sputter bursts
	//   C  2.2s →     steady vintage glow, faint mains wobble, and — if earlier
	//                 answers earned it — scheduled blackouts
	//
	// MODIFIERS, read once at mount (all null-safe for deep links):
	//   easy-or-hard 6  → dimmer, blackout ~every 10s
	//   easy-or-hard 7  → barely legible, blackout ~every 3s
	//   patience ≥ 6    → blackouts last 2.5–4s (a proper outage — they said
	//                     they could wait)
	//   patience ≤ 2    → no ramp, no sputter: the room cuts dark and the lamp
	//                     snaps on in one frame
	//   Ko-fi supporter → warmer bulb, NEVER blacks out. Someone paid the bill.
	//   reduced motion  → no sputter, no wobble, no blackouts; a fast fade to
	//                     the steady state. rAF ignores the app.css duration
	//                     killer, so this is gated here in JS, like PaintPool.
	//
	// Post-answer JS animation by design — the PatienceLens CSS rule does not
	// apply (docs/design.md), and the question holds until the entrance played.
	import { clearLamp, lamp, lampDebug } from './questions/lampState.svelte.js';
	import { patience } from './questions/patienceState.svelte.js';
	import { latestResponse } from './questions/metrics.svelte.js';

	const reduced =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ── modifiers, resolved once ───────────────────────────────────────────────
	const difficulty = lampDebug.severity ?? latestResponse('easy-or-hard')?.value ?? null;
	const pledgeIndex = latestResponse('coffee-button')?.value;
	const supporter =
		lampDebug.supporter ??
		(latestResponse('coffee-prompt')?.value === 'support' ||
			(typeof pledgeIndex === 'number' && pledgeIndex > 0));
	const patient = lampDebug.patient ?? (typeof patience.value === 'number' && patience.value >= 6);
	const impatient =
		lampDebug.impatient ?? (typeof patience.value === 'number' && patience.value <= 2);

	/** @type {'base' | 'dim' | 'severe'} */
	const tier = difficulty === 7 ? 'severe' : difficulty === 6 ? 'dim' : 'base';

	// Visual parameters per tier. `edge` is the vignette's darkness at the far
	// corners; `carve` is how much of it the lamp claws back at the cone centre.
	// The supporter bulb burns a little warmer whatever the wiring says.
	// `warm` is the multiply-tint strength: the bulb is an old incandescent, and
	// its amber should be unmistakable in the hotspot, not a hint.
	const P = {
		base: { edge: 0.74, carve: 0.92, warm: 0.42 },
		dim: { edge: 0.82, carve: 0.7, warm: 0.36 },
		severe: { edge: 0.88, carve: 0.49, warm: 0.3 }
	}[tier];
	const WARM = supporter ? P.warm + 0.08 : P.warm;
	const DARK_RAMP = 0.85; // phase-A ceiling, before the lamp exists
	const BLACKOUT = 0.93; // outage darkness — near-black

	// Blackout cadence. Supporters and reduced-motion users get none at all.
	const BLACKOUT_EVERY = supporter || reduced ? null : tier === 'severe' ? 3000 : tier === 'dim' ? 10000 : null;
	const OUTAGE_MS = () => (patient ? 2500 + rnd() * 1500 : 250 + rnd() * 100);
	const JITTER = tier === 'severe' ? 1000 : 2000;

	// Seeded, so the sputter and blackout schedule is deterministic per mount —
	// same trick as PaintPool's blob. Verifiable, and never a per-frame dice roll.
	function mulberry32(/** @type {number} */ s) {
		let a = s >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const rnd = mulberry32(0x1a3b5);

	// The lamp catching: a fixed 1s script of level over time. Used for the
	// phase-B entrance and, shortened, for every sputter-back after an outage.
	/** @param {number} ts ms into the sputter @returns {number} 0..1 */
	function sputterLevel(ts) {
		if (ts < 0) return 0;
		if (ts < 140) return 0.5;
		if (ts < 320) return 0;
		if (ts < 420) return 0.8;
		if (ts < 640) return 0;
		if (ts < 1000) return (ts - 640) / 360;
		return 1;
	}

	const ENTRANCE_MS = impatient || reduced ? 0 : 2200; // A + B
	const RAMP_MS = reduced ? 250 : 1200;
	// Dawn, on restart: never cut from a dark room straight to a bright page.
	const DOUSE_MS = reduced ? 300 : 1600;

	// THE PENDULUM. The fixture hangs from the ceiling and sways — slowly, like
	// something heavy on a cord. One state drives everything: theta swings the
	// beam's tilt, translates the pool across the table (the same pendulum arm),
	// and is published as a CSS variable so the paper's shadows counter-sway.
	// The second, incommensurate sine keeps it from metronoming.
	const SWAY_A = 0.1; // rad ≈ 5.7° — visible at page distance, still a heavy fixture
	const SWAY_W = (2 * Math.PI) / 5600; // ~5.6s period
	/** @param {number} t */
	const swayTheta = (t) =>
		reduced ? 0 : SWAY_A * Math.sin(t * SWAY_W) + 0.35 * SWAY_A * Math.sin(t * SWAY_W * 0.47 + 1.3);
	let publishedSway = NaN;
	let publishedOn = -1;

	/** @type {HTMLCanvasElement} */
	let canvasEl;
	/** @type {number} */
	let raf = 0;
	let lastSig = '';

	// The blackout schedule is built lazily as time passes.
	let nextBlackoutAt = ENTRANCE_MS + (BLACKOUT_EVERY ?? 0) + rnd() * JITTER;
	/** @type {{ from: number, until: number } | null} */
	let outage = null;

	$effect(() => {
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let w = 0;
		let h = 0;
		function resize() {
			w = window.innerWidth;
			h = window.innerHeight;
			canvasEl.width = Math.round(w * dpr);
			canvasEl.height = Math.round(h * dpr);
			lastSig = ''; // force a redraw at the new size
		}
		resize();
		window.addEventListener('resize', resize);

		// The beam is anchored to the DOCUMENT, not the viewport: the lamp lights
		// the top of the page, and scrolling moves you out of its pool into the
		// dark. The canvas element itself stays viewport-fixed (a document-height
		// canvas would be enormous on the seven-screen terms page) — only the
		// beam's coordinates are scroll-coupled, which is visually identical.
		let scrollTop = window.scrollY;
		const onScroll = () => {
			scrollTop = window.scrollY;
		};
		window.addEventListener('scroll', onScroll, { passive: true });

		const frame = () => {
			raf = requestAnimationFrame(frame);
			const t = performance.now() - (lamp.litAt ?? performance.now());

			// ── where are we in the arc? ──────────────────────────────────────
			/** overall room darkness (uniform floor) and lamp level (0..1) */
			let dark;
			let level;
			if (t < RAMP_MS && ENTRANCE_MS > 0) {
				// A: lights down. Cosine ease, no lamp yet.
				const p = t / RAMP_MS;
				dark = DARK_RAMP * (0.5 - 0.5 * Math.cos(Math.PI * p));
				level = 0;
			} else if (t < ENTRANCE_MS) {
				// B: the catch.
				dark = DARK_RAMP;
				level = sputterLevel(t - RAMP_MS);
			} else {
				dark = P.edge;
				level = 1;
				// Scheduled blackouts (tier 6/7 only; see BLACKOUT_EVERY).
				if (BLACKOUT_EVERY !== null) {
					if (!outage && t >= nextBlackoutAt) {
						outage = { from: t, until: t + OUTAGE_MS() };
					}
					if (outage) {
						if (t < outage.until) {
							dark = BLACKOUT;
							level = 0;
						} else if (t < outage.until + 600) {
							// the lamp catches again — a short reuse of the sputter
							dark = DARK_RAMP;
							level = sputterLevel(((t - outage.until) / 600) * 1000);
						} else {
							outage = null;
							nextBlackoutAt = t + BLACKOUT_EVERY + rnd() * JITTER;
						}
					}
				}
				// Idle vintage wobble — two slow out-of-phase sines. Supporters
				// bought a steadier bulb; reduced motion gets a rock-steady one.
				if (!reduced && level === 1) {
					const wobble = supporter
						? 0.008 * Math.sin(t * 0.0009)
						: 0.02 * Math.sin(t * 0.0013) + 0.015 * Math.sin(t * 0.0031 + 2.1);
					level = Math.max(0, 1 + wobble);
				}
			}

			// Dawn: the run ended, the room lights come back gradually. Everything
			// the overlay draws scales down together, then it retires itself.
			let fade = 1;
			if (lamp.douseAt !== null) {
				const d = (performance.now() - lamp.douseAt) / DOUSE_MS;
				if (d >= 1) {
					clearLamp(); // litAt → null; the parent unmounts this component
					return;
				}
				fade = 0.5 + 0.5 * Math.cos(Math.PI * d); // eased 1 → 0
			}

			// The pendulum, and its shadow echo. Two CSS variables drive the paper
			// shadows from THIS clock (no CSS transition — a 1.2s transition being
			// retargeted every frame would low-pass the sway into mush):
			//   --lamp-on   0→1 with the darkening ramp, →0 again at dawn
			//   --lamp-sway normalized −1..1 pendulum, already dawn-faded
			const theta = swayTheta(t);
			const swayNorm = Math.max(-1, Math.min(1, theta / SWAY_A));
			const onRamp =
				(t < RAMP_MS && ENTRANCE_MS > 0 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / RAMP_MS) : 1) * fade;
			const swayOut = swayNorm * fade;
			if (
				Number.isNaN(publishedSway) ||
				Math.abs(swayOut - publishedSway) >= 0.01 ||
				onRamp !== publishedOn
			) {
				publishedSway = swayOut;
				publishedOn = onRamp;
				document.documentElement.style.setProperty('--lamp-sway', swayOut.toFixed(3));
				document.documentElement.style.setProperty('--lamp-on', onRamp.toFixed(3));
			}

			// Steady-state thrift: skip the draw when nothing perceptible moved.
			// theta and scrollTop are in the signature, so a swaying or scrolling
			// lamp redraws continuously and a reduced-motion one still settles
			// into skipped frames.
			const sig = `${w}x${h}:${dark.toFixed(3)}:${level.toFixed(3)}:${fade.toFixed(3)}:${theta.toFixed(3)}:${Math.round(scrollTop)}`;
			if (sig === lastSig) return;
			lastSig = sig;
			dark *= fade;

			// ── draw ──────────────────────────────────────────────────────────
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);
			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = `rgba(10, 8, 5, ${dark})`;
			ctx.fillRect(0, 0, w, h);

			if (level > 0) {
				// The lamp hangs above the stack's top-right corner; the y-scale
				// elongates its pool into a shade-cast cone, the ~34° base tilt
				// leans it down-and-left, and the pendulum's theta swings BOTH the
				// tilt and the pool position — one arm, one motion. The rotation
				// lives in the GRADIENT's coordinate space only — the filled region
				// is always exactly the viewport quad, mapped through the inverse
				// transform, so no canvas edge can ever show at any sway angle.
				const BASE_TILT = 0.6; // ≈ 34°, clockwise: long axis top-right → bottom-left
				const TILT = BASE_TILT + theta;
				// The pendulum arm: the head's horizontal travel for this theta.
				const L = h * 0.85;
				const swayDx = L * (Math.sin(BASE_TILT + theta) - Math.sin(BASE_TILT));
				const cx = Math.min(w * 0.78, (w + Math.min(w, 620)) / 2) + swayDx;
				// Low enough that the beam's sharp near-rim is on-screen at the top
				// of the page — the whole point of the raked falloff is that both
				// edges can be seen — and anchored in DOCUMENT space: scrolling
				// carries the pool away with the page.
				const cy = h * 0.03 - scrollTop;
				const sy = 1.35;
				const R = Math.max(w, h) * 1.05;

				const cos = Math.cos(-TILT);
				const sin = Math.sin(-TILT);
				/** screen point → lamp space (un-translate, un-rotate, un-scale) */
				const inv = (/** @type {number} */ x, /** @type {number} */ y) => {
					const dx = x - cx;
					const dy = y - cy;
					return [dx * cos - dy * sin, (dx * sin + dy * cos) / sy];
				};
				/** Fill the exact viewport with a gradient defined in lamp space. */
				const fillLampSpace = (/** @type {CanvasGradient} */ gradient) => {
					ctx.save();
					ctx.translate(cx, cy);
					ctx.rotate(TILT);
					ctx.scale(1, sy);
					ctx.fillStyle = gradient;
					ctx.beginPath();
					const [x1, y1] = inv(0, 0);
					const [x2, y2] = inv(w, 0);
					const [x3, y3] = inv(w, h);
					const [x4, y4] = inv(0, h);
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.lineTo(x3, y3);
					ctx.lineTo(x4, y4);
					ctx.closePath();
					ctx.fill();
					ctx.restore();
				};

				// A real lamp is not a smooth fade: there is a bright pool where the
				// light lands directly (the hotspot plateau, 0 → 0.16), then a firm
				// but not hard shoulder where direct light gives way to spill
				// (0.16 → 0.34), then a long gradual tail into the room's darkness.
				//
				// The falloff is deliberately NOT the same in every direction: the
				// inner circle of the radial gradient is displaced up-beam (toward
				// the shade), which compresses the stops on that side — light cuts
				// to dark fast at the shade's rim — and stretches them down-beam,
				// the long rake across the table. That asymmetry is what reads as
				// "shining onto the desk diagonally" rather than a spotlight oval.
				const hole = ctx.createRadialGradient(0, -R * 0.22, 0, 0, 0, R);
				hole.addColorStop(0, `rgba(255, 255, 255, ${P.carve * level})`);
				hole.addColorStop(0.16, `rgba(255, 255, 255, ${P.carve * level * 0.96})`);
				hole.addColorStop(0.34, `rgba(255, 255, 255, ${P.carve * level * 0.38})`);
				hole.addColorStop(0.6, `rgba(255, 255, 255, ${P.carve * level * 0.14})`);
				hole.addColorStop(1, 'rgba(255, 255, 255, 0)');
				ctx.globalCompositeOperation = 'destination-out';
				fillLampSpace(hole);

				// The incandescent cast — old-bulb amber, strongest in the hotspot,
				// gone by the edge of the spill. 'multiply' rather than a glow:
				// tungsten doesn't add light to white paper, it TINTS it, pulling
				// the page toward amber exactly where the beam lands.
				const warmA = WARM * level * fade;
				// Same raked geometry for the tungsten tint, at its smaller radius.
				const warm = ctx.createRadialGradient(0, -R * 0.55 * 0.3, 0, 0, 0, R * 0.55);
				warm.addColorStop(0, `rgba(255, 196, 110, ${warmA})`);
				warm.addColorStop(0.3, `rgba(255, 190, 100, ${warmA * 0.6})`);
				warm.addColorStop(1, 'rgba(255, 190, 100, 0)');
				ctx.globalCompositeOperation = 'multiply';
				fillLampSpace(warm);
			}
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('scroll', onScroll);
			// No residue: a doused lamp must not leave the shadows leaning.
			document.documentElement.style.removeProperty('--lamp-sway');
			document.documentElement.style.removeProperty('--lamp-on');
		};
	});
</script>

<canvas class="lamp" bind:this={canvasEl} aria-hidden="true"></canvas>

<style>
	/* Above SoundControl (90) — the whole room darkens, chrome included — and
	   below the paper-grain body::after (100). pointer-events: none keeps every
	   control clickable through the darkness. */
	.lamp {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 95;
		pointer-events: none;
	}
</style>
