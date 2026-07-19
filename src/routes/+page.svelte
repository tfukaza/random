<script>
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { replaceState } from '$app/navigation';
	import { questions } from '$lib/questions/index.js';
	import PatienceLens from '$lib/PatienceLens.svelte';
	import BloodPool from '$lib/BloodPool.svelte';
	import { stash, clearStash } from '$lib/questions/stashState.svelte.js';
	import TemperamentHud from '$lib/TemperamentHud.svelte';
	import { patience, patienceMode } from '$lib/questions/patienceState.svelte.js';
	import { interludes } from '$lib/interludes.js';
	import Interlude from '$lib/Interlude.svelte';
	import Result from '$lib/questions/Result.svelte';
	import SplitText from '$lib/SplitText.svelte';
	import { emptyScores, mergeScores } from '$lib/scoring.js';
	import AudioController from '$lib/audio/AudioController.svelte';
	import SoundControl from '$lib/audio/SoundControl.svelte';
	import { CURRENT_VERSION } from '$lib/releases.js';
	import {
		audioState,
		hydrateAudioPreference,
		setAudioEnabled,
		setMusicRate,
		setMusicTrack,
		startAudio,
		stopMusic
	} from '$lib/audio/audio.svelte.js';

	// The quiz flow interleaves questions with interlude break cards: after the
	// question whose id is `after`, that interlude slots in. Interludes with
	// `after: null` show right before the result. Pinning to ids (not positions)
	// means interludes follow their question through any reorder of flowOrder.
	const flow = (() => {
		/** @type {Array<{kind: 'question', id: string, component: any, qNumber: number} | {kind: 'interlude', message: string, iNumber: number}>} */
		const items = [];
		let iCount = 0;
		questions.forEach(({ id, component }, qi) => {
			items.push({ kind: 'question', id, component, qNumber: qi + 1 });
			for (const il of interludes) {
				if (il.after === id)
					items.push({ kind: 'interlude', message: il.message, iNumber: ++iCount });
			}
		});
		for (const il of interludes) {
			if (il.after === null)
				items.push({ kind: 'interlude', message: il.message, iNumber: ++iCount });
		}
		return items;
	})();

	// Single-page state machine: intro → quiz (through `flow`) → result.
	let phase = $state('intro');
	let index = $state(0);
	let scores = $state(emptyScores());

	const current = $derived(flow[index]);
	const CurrentQuestion = $derived(current?.kind === 'question' ? current.component : null);

	// Formats that take over the whole question area (no № marker — they show
	// the question number their own way). Add future full-bleed formats here.
	const FULL_BLEED = new Set(['q21']);
	const showMarker = $derived(current?.kind === 'question' && !FULL_BLEED.has(current.id));
	const immersive = $derived(current?.kind === 'question' && current.id === 'q47');

	// The stretch of flow indices the patience lens governs: everything after
	// q29 up to the next interlude, which acts as the reset. Computed from the
	// flow rather than hardcoded positions so it survives reordering.
	const patienceBand = (() => {
		const start = flow.findIndex((f) => f.kind === 'question' && f.id === 'q29');
		if (start < 0) return null;
		const after = flow.findIndex((f, i) => i > start && f.kind === 'interlude');
		return { from: start + 1, to: after < 0 ? flow.length : after };
	})();

	// q47 is excluded because blurring or delaying a six-second physical reaction test would make
	// its outcome depend on the wrapper rather than the taker's choice.
	const lensed = $derived(
		!!patienceBand &&
			current?.kind === 'question' &&
			index >= patienceBand.from &&
			index < patienceBand.to &&
			current.id !== 'q47'
	);
	const lensMode = $derived(lensed ? patienceMode() : 'normal');
	$effect(() => {
		setMusicRate(lensMode === 'fast' ? 5 : lensMode === 'slow' ? 1 / 3 : 1);
	});

	// One bookmark tab peeks out from behind the certificate for every
	// interlude already passed — a wordless progress cue.
	const tabsEarned = $derived(
		phase === 'result'
			? interludes.length
			: phase === 'quiz'
				? flow.slice(0, index).filter((f) => f.kind === 'interlude').length
				: 0
	);

	// Debug helpers: /?q=7 opens question 7 directly, /?i=1 opens interlude 1
	// (i wins if both are present), and the current position is kept in the URL
	// while playing. Questions that depend on earlier answers won't have them
	// when deep-linked — that's fine, debug only.
	onMount(() => {
		hydrateAudioPreference();
		const params = new URLSearchParams(location.search);
		const i = Number(params.get('i'));
		const q = Number(params.get('q'));
		let target = -1;
		if (Number.isInteger(i) && i >= 1)
			target = flow.findIndex((f) => f.kind === 'interlude' && f.iNumber === i);
		if (target < 0 && Number.isInteger(q) && q >= 1)
			target = flow.findIndex((f) => f.kind === 'question' && f.qNumber === q);
		if (target >= 0) {
			index = target;
			phase = 'quiz';
		}
	});

	// Each question lands like a sheet of paper laid on the stack: a slight
	// top-hinged tilt flattening out as it drops into place.
	/**
	 * @param {Element} node
	 * @param {{ duration?: number, delay?: number }} [opts]
	 */
	function settle(node, { duration = 400, delay = 0 } = {}) {
		return {
			duration,
			delay,
			css: (/** @type {number} */ t, /** @type {number} */ u) =>
				`opacity: ${t}; transform-origin: top center; transform: perspective(60rem) translateY(${u * 24}px) rotateX(${u * 5}deg);`
		};
	}

	function syncUrl() {
		const item = flow[index];
		if (phase !== 'quiz' || !item) {
			replaceState(location.pathname, {});
		} else {
			replaceState(item.kind === 'question' ? `?q=${item.qNumber}` : `?i=${item.iNumber}`, {});
		}
	}

	function start() {
		const restarting = phase === 'result';
		if (restarting) {
			// End the report score synchronously before Result unmounts; asking for
			// another track alone leaves the report audible during its async handoff.
			stopMusic();
			void setMusicTrack('default', { restart: true });
		} else {
			startAudio();
		}
		scores = emptyScores();
		index = 0;
		phase = 'quiz';
		bandScored = false;
		clearStash();
		syncUrl();
	}

	/** @param {Event} event */
	function chooseSound(event) {
		setAudioEnabled(/** @type {HTMLInputElement} */ (event.currentTarget).checked);
	}

	// The patience band is a claim under test (scoring plan / design.md P2):
	// an extreme Q29 answer (≤2 or ≥6) subjects the taker to the fast/slow lens
	// for the rest of the band. Surviving it earns honesty (+ tempo in the pole
	// they claimed); taking the escape hatch is scored as the claim being a lie.
	// Middling claims (3–5) were never tested, so they earn nothing.
	let bandScored = false;
	function scoreBandExit() {
		if (bandScored || !patienceBand) return;
		bandScored = true;
		const v = patience.value;
		if (typeof v !== 'number' || (v > 2 && v < 6)) return;
		/** @type {Record<string, number>} */
		const delta = patience.bailed
			? { honesty: -4 }
			: { honesty: 4, tempo: v <= 2 ? 3 : -3 };
		scores = mergeScores(scores, delta);
	}

	function advance() {
		const leaving = flow[index];
		if (index + 1 < flow.length) {
			index += 1;
		} else {
			phase = 'result';
		}
		const arriving = flow[index];
		// Q50 owns a purpose-built score that ends with the impact. Keep the final
		// breathing-space card silent; Result explicitly starts its own theme only
		// after the taker presses Continue.
		if (leaving?.kind === 'question' && leaving.id === 'q50' && arriving?.kind === 'interlude')
			stopMusic();
		if (patienceBand && (index >= patienceBand.to || phase === 'result')) scoreBandExit();
		// An interlude is the bound on the bleeding: reaching one wipes the card.
		if (flow[index]?.kind === 'interlude') clearStash();
		syncUrl();
	}

	// The one contract every question shares: it hands back a score delta.
	// The orchestrator doesn't care how the answer was collected.
	/** @param {Record<string, number>} delta */
	function handleAnswer(delta) {
		scores = mergeScores(scores, delta);
		advance();
	}

	// Whether the live temperament meter is open — the page pads its bottom so
	// the certificate can always scroll clear of the panel.
	let hudOpen = $state(false);
</script>

<main class:hud-open={hudOpen && phase === 'quiz'}>
	<div class="stage">
		<!-- First child of the stage, and outside {#key index}: it paints beneath
		     the sheets and the certificate, and its wall-clock spread survives
		     every question change instead of restarting. -->
		{#if phase === 'quiz' && stash.hiddenAt !== null}
			<BloodPool />
		{/if}
		<span class="sheet sheet--under" aria-hidden="true"></span>
		<span class="sheet sheet--deep" aria-hidden="true"></span>
		{#each Array(tabsEarned) as _, t (t)}
			<span class="tab" style="--t: {t}" aria-hidden="true"></span>
		{/each}
		<span class="curl curl--left" aria-hidden="true"></span>
		<span class="curl curl--right" aria-hidden="true"></span>
		<div class="frame" class:frame--immersive={immersive}>
			<span class="corner corner--tl"></span>
			<span class="corner corner--tr"></span>
			<span class="corner corner--bl"></span>
			<span class="corner corner--br"></span>

			{#if phase === 'intro'}
				<section class="intro" in:scale={{ start: 0.98, duration: 400 }}>
					<span class="badge">personality quiz</span>
					<hr class="rule rule--scotch" />
					<h1><SplitText text="What kind of person are you?" delay={300} stagger={32} /></h1>
					<div class="fleuron" aria-hidden="true">
						<hr class="rule" />
						<span>❦</span>
						<hr class="rule" />
					</div>
					<p>
						A handful of very different questions. No wrong answers — just go with
						your gut.
					</p>
					<label class="sound-choice">
						<input type="checkbox" checked={audioState.enabled} onchange={chooseSound} />
						<span>Play with sound</span>
					</label>
					<button class="start" onpointerdown={startAudio} onclick={start}
						><span class="start-label">Begin</span></button
					>
					<a class="release-link" href="/releases">Release notes · v{CURRENT_VERSION}</a>
				</section>
			{:else if phase === 'quiz'}
				<section class="quiz" in:scale={{ start: 0.98, duration: 400 }}>
					{#key index}
						<div class="question" in:settle={{ duration: 400 }}>
							{#if current.kind === 'question'}
								<!-- Each question owns its own layout & input; we only pass the callback
								     (plus its number, for formats that display it themselves).
								     `key` forces a fresh instance per question so internal state resets.
								     The № marker sits INSIDE the lens so the patience governor scales
								     its arrival too — outside, it would keep animating at full speed
								     while everything below it crawled. -->
								<PatienceLens mode={lensMode} debug={lensed}>
									{#if showMarker}
										<div class="question-marker">
											<hr class="rule" />
											<span class="question-number">
												<svg viewBox="0 0 72 72" aria-hidden="true">
													<circle cx="36" cy="36" r="34" />
												</svg>
												<span class="numeral"><span class="no">№</span>{current.qNumber}</span>
											</span>
											<hr class="rule" />
										</div>
									{/if}
									<CurrentQuestion onAnswer={handleAnswer} qNumber={current.qNumber} />
								</PatienceLens>
							{:else}
								<Interlude message={current.message} onNext={advance} />
							{/if}
						</div>
					{/key}
				</section>
			{:else}
				<div in:scale={{ start: 0.98, duration: 400 }}>
					<Result {scores} onRestart={start} />
				</div>
			{/if}
		</div>
	</div>
</main>

<AudioController active={phase !== 'intro'} />
{#if phase !== 'intro'}
	<SoundControl />
{/if}

{#if phase === 'quiz'}
	<TemperamentHud {scores} onToggle={(/** @type {boolean} */ o) => (hudOpen = o)} />
{/if}

<style>
	main {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: clamp(1.5rem, 5vw, 4rem) 1.25rem 4rem;
		/* BloodPool spreads well wider than the certificate on purpose, which was
		   making the document wider than the screen — and a page wider than the
		   viewport renders shrunken on a phone. `clip` rather than `hidden`: hidden
		   would force the vertical axis into a scroll container and break page
		   scrolling, whereas clip cuts the horizontal spill only and leaves the
		   pool free to run past the bottom edge. */
		overflow-x: clip;
	}
	.sound-choice {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: max-content;
		margin: -1rem auto 1.25rem;
		color: var(--muted);
		font-size: 0.85rem;
		cursor: pointer;
		animation: rise 0.45s 1.4s both;
	}
	.sound-choice input {
		margin: 0;
		accent-color: var(--ink);
	}
	/* Room for the open temperament meter, so the certificate's bottom edge
	   (Next buttons, ground shadows) can always be scrolled clear of it. */
	main.hud-open {
		padding-bottom: 11rem;
	}
	@media (max-width: 560px) {
		main.hud-open {
			padding-bottom: 12rem;
		}
	}
	.stage {
		position: relative;
		width: 100%;
		max-width: var(--maxw);
	}
	/* A couple of sheets peeking out under the certificate. */
	.sheet {
		position: absolute;
		inset: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow:
			0 0.125rem 0.125rem rgba(0, 0, 0, 0.035),
			0 0.5rem 0.5rem rgba(0, 0, 0, 0.03),
			0 1rem 1rem rgba(0, 0, 0, 0.025);
	}
	.sheet--under {
		transform: rotate(0.7deg);
	}
	.sheet--deep {
		transform: rotate(-0.5deg);
	}
	/* Bookmark tabs: one slides out from behind the certificate per interlude
	   passed. Gradients fake the slight curl of a paper tab; the inset shadow
	   is the frame's edge darkening the tab where it emerges. */
	.tab {
		position: absolute;
		top: calc(5.5rem + var(--t) * 3rem);
		right: -1.85rem;
		width: 2.6rem;
		height: 1.5rem;
		border-radius: 0 2px 2px 0;
		background:
			linear-gradient(to bottom, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 40%, rgba(0, 0, 0, 0.05)),
			linear-gradient(to right, #c7c7c5, #ececea 55%, #d2d2d0);
		box-shadow:
			0.125rem 0.25rem 0.375rem rgba(0, 0, 0, 0.13),
			0.0625rem 0.125rem 0.125rem rgba(0, 0, 0, 0.09),
			inset 0.6rem 0 0.5rem -0.45rem rgba(0, 0, 0, 0.22);
		animation: tab-out 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes tab-out {
		from {
			transform: translateX(-1.7rem) rotate(0deg);
		}
		to {
			transform: translateX(0) rotate(calc((var(--t) - 1) * 0.8deg));
		}
	}
	@media (max-width: 700px) {
		.tab {
			right: -1rem;
			width: 1.8rem;
		}
	}
	/* Curled-paper ground shadows: the certificate lifts a touch at its
	   bottom corners, so the shadow there is deeper and angled. */
	.curl {
		position: absolute;
		bottom: 0.55rem;
		width: 42%;
		height: 1rem;
		box-shadow: 0 0.9rem 0.7rem rgba(0, 0, 0, 0.12);
	}
	.curl--left {
		left: 0.75rem;
		transform: rotate(-2.5deg);
	}
	.curl--right {
		right: 0.75rem;
		transform: rotate(2.5deg);
	}
	/* Certificate-style double-line frame around every screen. The certificate
	   is the one physical object in the scene, so it alone casts a shadow —
	   a layered stack approximating a real penumbra, plus a contact edge.
	   Everything printed on it stays flat. */
	.frame {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--rule);
		padding: clamp(1.75rem, 5vw, 3rem);
		box-shadow:
			0 0.0625rem 0.0625rem rgba(0, 0, 0, 0.05),
			0 0.125rem 0.125rem rgba(0, 0, 0, 0.045),
			0 0.25rem 0.25rem rgba(0, 0, 0, 0.04),
			0 0.5rem 0.5rem rgba(0, 0, 0, 0.035),
			0 1rem 1rem rgba(0, 0, 0, 0.03),
			0 2rem 2rem rgba(0, 0, 0, 0.025),
			0 0 0.0625rem rgba(0, 0, 0, 0.055);
	}
	.frame--immersive {
		padding: clamp(0.7rem, 2vw, 1rem);
	}
	.frame::before {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid var(--border);
		pointer-events: none;
	}
	.corner {
		position: absolute;
		width: 7px;
		height: 7px;
		background: var(--rule);
		pointer-events: none;
		z-index: 1;
	}
	.corner--tl {
		top: 5px;
		left: 5px;
		transform: translate(-50%, -50%) rotate(45deg);
	}
	.corner--tr {
		top: 5px;
		right: 5px;
		transform: translate(50%, -50%) rotate(45deg);
	}
	.corner--bl {
		bottom: 5px;
		left: 5px;
		transform: translate(-50%, 50%) rotate(45deg);
	}
	.corner--br {
		bottom: 5px;
		right: 5px;
		transform: translate(50%, 50%) rotate(45deg);
	}
	.intro {
		text-align: center;
		padding-top: 1.5rem;
	}
	.badge {
		display: inline-block;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: var(--muted);
		padding: 0.35rem 0.85rem;
		margin-bottom: 1.25rem;
		animation: rise 0.45s both;
	}
	.intro .rule--scotch {
		margin: 0 0 2rem;
		animation: draw 0.6s 0.15s both;
	}
	.intro h1 {
		font-size: clamp(2.25rem, 6vw, 3.25rem);
		margin: 0 0 1.5rem;
		line-height: 1.1;
	}
	.fleuron {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 12rem;
		margin: 0 auto 1.5rem;
	}
	.fleuron .rule {
		flex: 1;
		animation: draw 0.5s 1.2s both;
	}
	.fleuron span {
		color: var(--ink);
		font-size: 1.1rem;
		line-height: 1;
		animation: rise 0.4s 1.1s both;
	}
	.intro p {
		color: var(--muted);
		max-width: 40ch;
		margin: 0 auto 2.5rem;
		animation: rise 0.5s 1.3s both;
	}
	.start {
		position: relative;
		overflow: hidden;
		padding: 0.9rem 2.5rem;
		font-size: 1.05rem;
		font-weight: 600;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.5s 1.5s both;
		transition: transform 0.12s ease;
	}
	.start::before {
		content: '';
		position: absolute;
		inset: 0;
		background: #0f0f0f;
		transform: translateX(-101%);
		transition: transform 0.3s ease;
	}
	.start:hover::before {
		transform: translateX(0);
	}
	.start:hover {
		transform: translateY(-2px);
	}
	.start-label {
		position: relative;
	}
	.release-link {
		display: block;
		width: max-content;
		margin: 1.5rem auto -0.25rem;
		color: var(--muted);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-decoration-color: var(--rule);
		text-underline-offset: 0.25em;
		text-transform: uppercase;
		animation: rise 0.5s 1.65s both;
	}
	.release-link:hover {
		color: var(--ink);
	}
	.question-marker {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin: 0.5rem 0 2.25rem;
	}
	.question-marker .rule {
		flex: 1;
		animation: draw 0.6s both;
	}
	.question-number {
		position: relative;
		width: 4.5rem;
		height: 4.5rem;
		flex-shrink: 0;
	}
	.question-number svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.question-number circle {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1.5;
		stroke-dasharray: 213.63;
		stroke-dashoffset: 213.63;
		animation: trace 0.7s ease-out 0.1s forwards;
	}
	@keyframes trace {
		to {
			stroke-dashoffset: 0;
		}
	}
	.numeral {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Lora', Georgia, serif;
		font-size: 1.8rem;
		font-weight: 600;
		color: var(--ink);
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
		animation: rise 0.4s 0.45s both;
	}
	.no {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--muted);
		margin-right: 0.3rem;
		transform: translateY(-0.45em);
	}
</style>
