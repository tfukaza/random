<script>
	// Q47 — no prompt and no labelled choices. The taker is dropped into an
	// elevator as its doors start closing on somebody running for it. The only
	// meaningful affordances are the real door controls on the panel.
	import { onMount } from 'svelte';
	import { audio, audioState } from '$lib/audio/audio.svelte.js';
	import { deliveryState, recordDraft } from '$lib/questions/metrics.svelte.js';
	import { lamp } from './lampState.svelte.js';

	let { onAnswer } = $props();

	const DOOR_MS = 6000;
	const FLOORS = [1, 2, 3, 4, 5, 6];

	let phase = $state(
		/** @type {'ready' | 'closing' | 'saved' | 'closed' | 'timed-out'} */ ('ready')
	);
	let litFloors = $state(/** @type {Set<number>} */ (new Set()));
	let announcement = $state('');
	/** @type {HTMLDivElement | undefined} */
	let elevatorElement;

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let sceneTimer;
	/** @type {number | undefined} */
	let startFrame;
	let timerDeadline = 0;
	let timerRemaining = 0;
	/** @type {(() => void) | null} */
	let timerCallback = null;
	let scenePaused = $state(false);
	/** @type {Set<Animation>} */
	const pausedAnimations = new Set();
	/** @type {ReturnType<typeof audio.sfx.createScope> | null} */
	let sceneSounds = null;
	let syncSceneClock = () => {};

	const active = $derived(phase === 'closing' && !scenePaused);

	$effect(() => {
		// Reading both fields makes interruption and user-preference changes part
		// of the same clock that visibility changes drive.
		audioState.enabled;
		audioState.status;
		deliveryState.locked;
		syncSceneClock();
	});

	function clockIsBlocked() {
		return (
			document.hidden ||
			deliveryState.locked ||
			(audioState.enabled &&
				['locked', 'loading', 'interrupted', 'recoverable'].includes(audioState.status))
		);
	}

	function cancelSceneTimer() {
		clearTimeout(sceneTimer);
		sceneTimer = undefined;
		timerCallback = null;
		timerDeadline = 0;
		timerRemaining = 0;
	}

	function pauseSceneTimer() {
		if (sceneTimer !== undefined) {
			timerRemaining = Math.max(0, timerDeadline - performance.now());
			clearTimeout(sceneTimer);
			sceneTimer = undefined;
		}
	}

	function resumeSceneTimer() {
		if (sceneTimer !== undefined || !timerCallback || clockIsBlocked()) return;
		const callback = timerCallback;
		timerDeadline = performance.now() + timerRemaining;
		sceneTimer = setTimeout(() => {
			sceneTimer = undefined;
			timerCallback = null;
			timerDeadline = 0;
			timerRemaining = 0;
			callback();
		}, timerRemaining);
	}

	/** @param {() => void} callback @param {number} duration */
	function setSceneTimer(callback, duration) {
		cancelSceneTimer();
		timerCallback = callback;
		timerRemaining = duration;
		resumeSceneTimer();
	}

	function pauseSceneAnimations() {
		if (!elevatorElement) return;
		for (const animation of elevatorElement.getAnimations({ subtree: true })) {
			if (animation.playState !== 'running') continue;
			animation.pause();
			pausedAnimations.add(animation);
		}
	}

	function resumeSceneAnimations() {
		for (const animation of pausedAnimations) {
			if (animation.playState === 'paused') animation.play();
		}
		pausedAnimations.clear();
	}

	/**
	 * Resolve once. Whichever arrives first — a button or the six-second
	 * deadline — owns the score and the short visual beat before navigation.
	 * @param {'saved' | 'closed' | 'timed-out'} outcome
	 */
	function resolve(outcome) {
		if (!active) return;
		cancelSceneTimer();
		phase = outcome;
		recordDraft({ format: 'scene-action', value: outcome, label: outcome });
		sceneSounds?.stop();
		// Door controls intentionally layer their physical button click with the
		// resulting door mechanism; both belong to this scene scope.
		if (outcome !== 'timed-out') void sceneSounds?.play('elevator-button');

		if (outcome === 'saved') {
			void sceneSounds?.play('elevator-open');
			announcement = 'The doors reopen and the person makes the elevator.';
			setSceneTimer(
				() => onAnswer({ social: 2, coord: 1, risk: 1, tempo: 2 }),
				1000
			);
		} else if (outcome === 'closed') {
			void sceneSounds?.play('elevator-shut');
			announcement = 'The close-door button is pressed. The doors shut.';
			setSceneTimer(
				() => onAnswer({ social: -3, tempo: 2, coord: -1 }),
				700
			);
		} else {
			void sceneSounds?.play('elevator-shut');
			// Freezing until the deadline decides for you is its own answer.
			announcement = 'The doors shut before the person reaches the elevator.';
			setSceneTimer(
				() => onAnswer({ risk: -2, tempo: -2, social: -1 }),
				700
			);
		}
	}

	/** @param {number} floor */
	function pressFloor(floor) {
		if (!active) return;
		const next = new Set(litFloors);
		next.has(floor) ? next.delete(floor) : next.add(floor);
		litFloors = next;
		void sceneSounds?.play('elevator-button');
	}

	onMount(() => {
		sceneSounds = audio.sfx.createScope('elevator');
		const releaseDuck = audio.music.duck('elevator', 0.22);

		function beginScene() {
			if (phase !== 'ready' || clockIsBlocked()) return;
			phase = 'closing';
			announcement = 'Elevator doors are closing. A person is running toward the elevator.';
			void sceneSounds?.play('elevator-approach');
			setSceneTimer(() => resolve('timed-out'), DOOR_MS);
		}

		syncSceneClock = () => {
			if (clockIsBlocked()) {
				if (!scenePaused) {
					scenePaused = true;
					pauseSceneTimer();
					pauseSceneAnimations();
				}
				return;
			}
			if (scenePaused) {
				scenePaused = false;
				resumeSceneAnimations();
				resumeSceneTimer();
			}
			if (phase === 'ready') beginScene();
		};
		const visibilityChanged = () => syncSceneClock();
		document.addEventListener('visibilitychange', visibilityChanged);

		// Wait one painted frame so CSS has an open-door starting position to
		// transition from. The decision window begins exactly when motion begins.
		startFrame = requestAnimationFrame(() => {
			syncSceneClock();
			// If an interruption landed in the same frame as the phase change, pause
			// the newly-created CSS transitions on the following paint too.
			if (scenePaused) startFrame = requestAnimationFrame(pauseSceneAnimations);
		});

		return () => {
			document.removeEventListener('visibilitychange', visibilityChanged);
			syncSceneClock = () => {};
			sceneSounds?.dispose();
			sceneSounds = null;
			releaseDuck();
			if (startFrame !== undefined) cancelAnimationFrame(startFrame);
			cancelSceneTimer();
			pausedAnimations.clear();
		};
	});
</script>

<div
	bind:this={elevatorElement}
	class="elevator"
	class:closing={phase === 'closing'}
	class:saved={phase === 'saved'}
	class:closed={phase === 'closed'}
	class:timed-out={phase === 'timed-out'}
	class:lamplit={lamp.litAt !== null}
	aria-describedby="elevator-scene"
>
	<p id="elevator-scene" class="sr-only" data-reader-text>
		You are inside an elevator looking through its open doors. A person is running toward you as
		the doors begin to close. The control panel is to the right.
	</p>
	<p class="sr-only" aria-live="polite">{announcement}</p>

	<!-- Every part of the cab is CSS. Only the approaching person is generated artwork. -->
	<div class="door-bay" aria-hidden="true">
		<div class="hallway">
			<img class="runner" src="/images/q47-signs/run-v2.png" alt="" />
		</div>
		<div class="door door-left"><span></span></div>
		<div class="door door-right"><span></span></div>
		<div class="header-track"></div>
		<div class="sill"></div>
	</div>

	<div class="panel" role="group" aria-label="Elevator control panel">
		<div class="display" role="status" aria-label="Current floor 4, going up">
			<span class="up" aria-hidden="true"></span><b>4</b>
		</div>

		<!-- These come before the floor buttons in DOM order so a keyboard user
		     reaches the consequential controls first. CSS places them last visually. -->
		<div class="door-controls">
			<button
				class="door-button open-button"
				data-sfx="none"
				class:lit={phase === 'saved'}
				disabled={!active}
				aria-label="Hold elevator door open"
				data-reader-option="Hold the elevator door open"
				data-answer-id="open"
				onclick={() => resolve('saved')}
			>
				<span aria-hidden="true">◀&nbsp;▶</span>
			</button>
			<button
				class="door-button close-button"
				data-sfx="none"
				class:lit={phase === 'closed'}
				disabled={!active}
				aria-label="Close elevator door"
				data-reader-option="Close the elevator door"
				data-answer-id="close"
				onclick={() => resolve('closed')}
			>
				<span aria-hidden="true">▶&nbsp;◀</span>
			</button>
		</div>

		<div class="floor-buttons" role="group" aria-label="Floor buttons">
			{#each FLOORS as floorNumber}
				<button
					data-sfx="none"
					class:lit={litFloors.has(floorNumber)}
					disabled={!active}
					aria-pressed={litFloors.has(floorNumber)}
					aria-label="Floor {floorNumber}"
					onclick={() => pressFloor(floorNumber)}
				>
					{floorNumber}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.elevator {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: clamp(29rem, 74svh, 34rem);
		min-height: 29rem;
		overflow: hidden;
		font-family: inherit;
		background: transparent;
		animation: rise 0.45s both;
	}

	.door-bay {
		position: absolute;
		z-index: 3;
		top: 4%;
		bottom: 4%;
		left: 3.5%;
		right: clamp(7.7rem, 28%, 9rem);
		overflow: hidden;
		background: transparent;
		border: clamp(0.45rem, 1.6vw, 0.7rem) solid var(--rule);
	}

	.hallway {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: transparent;
	}
	.runner {
		position: absolute;
		z-index: 2;
		left: 50%;
		bottom: 5%;
		width: min(66%, 17rem);
		height: auto;
		object-fit: contain;
		transform: translate(-50%, 0) scale(0.34);
		transform-origin: center bottom;
		transition:
			transform 6s linear,
			opacity 0.25s ease;
		will-change: transform;
	}
	.closing .runner {
		transform: translate(-50%, 5%) scale(0.76);
	}
	.saved .runner {
		transform: translate(-50%, 17%) scale(1.08);
		opacity: 0;
		transition:
			transform 0.85s ease-in,
			opacity 0.22s ease 0.66s;
	}
	.closed .runner,
	.timed-out .runner {
		transform: translate(-50%, 5%) scale(0.78);
	}

	/* The doors hang PROUD of the hallway: each leaf is brushed steel with a
	   drop shadow cast into the bay (depth between door and frame), and the two
	   leaves sit at slightly different depths — the right one behind, a touch
	   darker, so their meeting edge reads as an overlap rather than a seam. */
	.door {
		position: absolute;
		z-index: 4;
		top: 0;
		bottom: 0;
		width: 50.4%;
		transition:
			transform 6s linear,
			box-shadow 1.2s ease;
		will-change: transform;
	}
	.door span {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: rgba(0, 0, 0, 0.1);
		box-shadow: 1px 0 0 rgba(255, 255, 255, 0.55);
	}
	/* At rest (parked in their pockets) the leaves carry only their sheen — a
	   drop shadow hugging the outer frame while nothing moves reads wrong. The
	   cast shadows fade in with `.closing` below, as the leaves actually emerge. */
	.door-left {
		left: 0;
		transform: translateX(-94%);
		z-index: 5; /* the front leaf — overlaps the right at the meet */
		border-right: 1px solid #8f8f8c;
		background: linear-gradient(to right, #ececea 0%, #f6f6f4 30%, #e2e2df 78%, #d3d3d0 100%);
		box-shadow: inset 0 0 0.5rem rgba(255, 255, 255, 0.4);
	}
	.door-left span {
		right: 18%;
	}
	.door-right {
		right: 0;
		transform: translateX(94%);
		border-left: 1px solid #8f8f8c;
		background: linear-gradient(to left, #e4e4e1 0%, #ededea 30%, #d8d8d5 78%, #c9c9c6 100%);
		box-shadow: inset 0 0 0.5rem rgba(255, 255, 255, 0.35);
	}
	.door-right span {
		left: 18%;
	}
	.closing .door,
	.closed .door,
	.timed-out .door {
		transform: translateX(0);
	}
	.closing .door-left,
	.closed .door-left,
	.timed-out .door-left {
		box-shadow:
			0.5rem 0 0.9rem rgba(0, 0, 0, 0.28),
			inset 0 0 0.5rem rgba(255, 255, 255, 0.4);
	}
	.closing .door-right,
	.closed .door-right,
	.timed-out .door-right {
		box-shadow:
			-0.5rem 0 0.9rem rgba(0, 0, 0, 0.24),
			inset 0 0 0.5rem rgba(255, 255, 255, 0.35);
	}
	.saved .door-left {
		transform: translateX(-94%);
	}
	.saved .door-right {
		transform: translateX(94%);
	}
	.saved .door {
		transition-duration: 0.4s;
		transition-timing-function: ease-out;
	}
	/* THE SLAM. Pressing close-door is a choice, and the doors behave like it:
	   they snap shut hard and the whole cab kicks from the impact. (Timing out
	   keeps its own quick-but-unceremonious close below.)

	   The targets are a hair PAST centre, not translateX(0) — retiming an
	   in-flight transition toward the same value does nothing (the doors would
	   keep gliding at the 6s pace), so the slammed state must move the goalposts
	   for the 0.14s duration to take hold. The ~0.4% overpress doubles as the
	   crunch of a hard slam; the leaves just overlap at the seam. */
	.closed .door {
		transition-duration: 0.14s;
		transition-timing-function: cubic-bezier(0.7, 0, 1, 1);
	}
	.closed .door-left {
		transform: translateX(0.4%);
	}
	.closed .door-right {
		transform: translateX(-0.4%);
	}
	.closed .door-bay {
		animation: slam-kick 0.32s 0.14s;
	}
	@keyframes slam-kick {
		0%,
		100% {
			transform: translate(0, 0);
		}
		20% {
			transform: translate(0, -3px);
		}
		50% {
			transform: translate(0, 2px);
		}
		78% {
			transform: translate(-1px, 0);
		}
	}
	.timed-out .door {
		transition-duration: 0.08s;
	}

	.header-track,
	.sill {
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		background: var(--rule);
	}
	.header-track {
		top: 0;
		height: 0.42rem;
	}
	.sill {
		bottom: 0;
		height: 0.5rem;
	}

	/* Brushed-steel faceplate: a soft vertical sheen, a bevelled edge (inset
	   highlight above, inset shade below), a real drop shadow onto the cab wall,
	   and a screw in each corner. Even padding all round — the old clamp() pads
	   were what made the margins feel off. */
	.panel {
		position: absolute;
		z-index: 9;
		top: 13%;
		right: clamp(0.35rem, 1.8vw, 0.75rem);
		width: clamp(7.15rem, 26%, 8rem);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.85rem 0.6rem 0.75rem;
		background:
			radial-gradient(0.14rem circle at 0.32rem 0.32rem, #8f8f8c 40%, #d8d8d5 55%, transparent 70%),
			radial-gradient(0.14rem circle at calc(100% - 0.32rem) 0.32rem, #8f8f8c 40%, #d8d8d5 55%, transparent 70%),
			radial-gradient(0.14rem circle at 0.32rem calc(100% - 0.32rem), #8f8f8c 40%, #d8d8d5 55%, transparent 70%),
			radial-gradient(0.14rem circle at calc(100% - 0.32rem) calc(100% - 0.32rem), #8f8f8c 40%, #d8d8d5 55%, transparent 70%),
			linear-gradient(178deg, #f2f2f0 0%, #e2e2df 55%, #eaeae7 100%);
		border: 1px solid #adadaa;
		border-radius: 3px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.85),
			inset 0 -1px 0 rgba(0, 0, 0, 0.08),
			0.25rem 0.35rem 0.7rem rgba(0, 0, 0, 0.18);
	}

	/* The floor indicator is the one glowing thing in the cab: a recessed dark
	   window with an amber filament readout. */
	.display {
		order: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		height: 2.5rem;
		background: linear-gradient(#171612, #262319);
		border: 1px solid #45423a;
		border-radius: 2px;
		color: #e8b04a;
		box-shadow:
			inset 0 2px 5px rgba(0, 0, 0, 0.65),
			inset 0 -1px 0 rgba(255, 255, 255, 0.06);
		text-shadow: 0 0 6px rgba(232, 176, 74, 0.55);
		font-family: 'Cormorant Garamond', Georgia, serif;
	}
	.display b {
		font-size: 1.55rem;
		font-weight: 700;
		line-height: 1;
	}
	.up {
		width: 0;
		height: 0;
		border-left: 0.32rem solid transparent;
		border-right: 0.32rem solid transparent;
		border-bottom: 0.52rem solid currentColor;
		filter: drop-shadow(0 0 3px rgba(232, 176, 74, 0.5));
	}

	.floor-buttons {
		order: 2;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem 0.4rem;
		justify-items: center;
	}
	/* Round domed buttons, like an actual cab: a raised radial highlight, a rim,
	   a drop shadow onto the plate — and a press that physically sinks. */
	.floor-buttons button,
	.door-button {
		width: 2.85rem;
		height: 2.85rem;
		min-width: 0;
		min-height: 0;
		padding: 0;
		border-radius: 50%;
		border: 1px solid #a3a3a0;
		background: radial-gradient(circle at 32% 28%, #ffffff 0%, #ececea 52%, #cfcfcc 100%);
		color: var(--ink);
		font: inherit;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.9),
			inset 0 -2px 3px rgba(0, 0, 0, 0.12),
			0 2px 3px rgba(0, 0, 0, 0.22);
		transition:
			transform 0.08s ease,
			box-shadow 0.12s ease,
			border-color 0.15s ease,
			filter 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	.floor-buttons button:hover:not(:disabled),
	.door-button:hover:not(:disabled) {
		filter: brightness(1.05);
		border-color: #8f8f8c;
	}
	.floor-buttons button:active:not(:disabled),
	.door-button:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow:
			inset 0 2px 4px rgba(0, 0, 0, 0.28),
			inset 0 -1px 1px rgba(255, 255, 255, 0.4),
			0 1px 1px rgba(0, 0, 0, 0.15);
	}
	.floor-buttons button:focus-visible,
	.door-button:focus-visible {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	/* A pressed floor lights its lamp ring, the way real cab buttons do. */
	.floor-buttons button.lit,
	.door-button.lit {
		border-color: #c9a25a;
		background: radial-gradient(circle at 32% 28%, #fff8e8 0%, #f4e6c4 52%, #ddc290 100%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.9),
			inset 0 -2px 3px rgba(0, 0, 0, 0.1),
			0 0 0 2px rgba(232, 176, 74, 0.35),
			0 0 9px rgba(232, 176, 74, 0.5),
			0 2px 3px rgba(0, 0, 0, 0.2);
	}
	.floor-buttons button:disabled,
	.door-button:disabled {
		cursor: default;
		opacity: 0.78;
	}
	.floor-buttons button.lit:disabled,
	.door-button.lit:disabled {
		opacity: 1;
	}

	/* An etched groove separates the door controls from the floors. */
	.door-controls {
		order: 3;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.4rem;
		justify-items: center;
		padding-top: 0.55rem;
		border-top: 1px solid rgba(0, 0, 0, 0.14);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
	}
	.door-button {
		width: 3.1rem;
		height: 3.1rem;
	}
	.door-button span {
		display: block;
		font-size: clamp(0.62rem, 2vw, 0.78rem);
		letter-spacing: -0.08em;
		white-space: nowrap;
	}

	/* ── after dark mode: the panel is backlit ────────────────────────────────
	   With the room lamp lit (light-or-dark answered dark), every button gets
	   the soft halo of a backlit cab panel at night, and the floor display burns
	   a little harder. Selected buttons outshine the rest. */
	.lamplit .floor-buttons button,
	.lamplit .door-button {
		border-color: #b98f4e;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.9),
			inset 0 -2px 3px rgba(0, 0, 0, 0.12),
			0 0 8px rgba(255, 196, 110, 0.45),
			0 2px 3px rgba(0, 0, 0, 0.22);
	}
	.lamplit .floor-buttons button.lit,
	.lamplit .door-button.lit {
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.9),
			inset 0 -2px 3px rgba(0, 0, 0, 0.1),
			0 0 0 2px rgba(232, 176, 74, 0.5),
			0 0 14px rgba(255, 196, 110, 0.8),
			0 2px 3px rgba(0, 0, 0, 0.2);
	}
	.lamplit .display {
		color: #ffc45e;
		text-shadow: 0 0 9px rgba(255, 196, 110, 0.85);
		box-shadow:
			inset 0 2px 5px rgba(0, 0, 0, 0.65),
			inset 0 -1px 0 rgba(255, 255, 255, 0.06),
			0 0 10px rgba(232, 176, 74, 0.3);
	}

	@media (max-width: 410px) {
		.elevator {
			height: clamp(29rem, 78svh, 31.5rem);
		}
		.door-bay {
			left: 2.5%;
			right: 7.65rem;
		}
		.panel {
			right: 0.3rem;
			width: 7.15rem;
			gap: 0.45rem;
			padding: 0.6rem 0.4rem 0.55rem;
		}
		.floor-buttons,
		.door-controls {
			gap: 0.32rem;
		}
		.floor-buttons button {
			width: 2.6rem;
			height: 2.6rem;
		}
		.door-button {
			width: 2.85rem;
			height: 2.85rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.runner {
			transform: translate(-50%, 3%) scale(0.64);
			transition: none;
		}
		.closing .runner,
		.saved .runner,
		.closed .runner,
		.timed-out .runner {
			transform: translate(-50%, 3%) scale(0.64);
		}
		.closing .door-left {
			transform: translateX(-52%);
		}
		.closing .door-right {
			transform: translateX(52%);
		}
		.closing .door {
			transition: none;
		}
		.saved .door-left {
			transform: translateX(-94%);
		}
		.saved .door-right {
			transform: translateX(94%);
		}
		.closed .door,
		.timed-out .door {
			transform: translateX(0);
		}
	}
</style>
