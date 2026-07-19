<script>
	// Q47 — no prompt and no labelled choices. The taker is dropped into an
	// elevator as its doors start closing on somebody running for it. The only
	// meaningful affordances are the real door controls on the panel.
	import { onMount } from 'svelte';
	import { clearMusicDuck, duckMusic, playSfx, stopSfx } from '$lib/audio/audio.svelte.js';

	let { onAnswer } = $props();

	const DOOR_MS = 6000;
	const FLOORS = [1, 2, 3, 4, 5, 6];

	let phase = $state(
		/** @type {'ready' | 'closing' | 'saved' | 'closed' | 'timed-out'} */ ('ready')
	);
	let litFloors = $state(/** @type {Set<number>} */ (new Set()));
	let announcement = $state('');

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let deadline;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let advanceTimer;
	/** @type {number | undefined} */
	let startFrame;

	const active = $derived(phase === 'closing');

	/**
	 * Resolve once. Whichever arrives first — a button or the six-second
	 * deadline — owns the score and the short visual beat before navigation.
	 * @param {'saved' | 'closed' | 'timed-out'} outcome
	 */
	function resolve(outcome) {
		if (!active) return;
		clearTimeout(deadline);
		phase = outcome;
		stopSfx('elevator-scene');

		if (outcome === 'saved') {
			void playSfx('elevator-open');
			announcement = 'The doors reopen and the person makes the elevator.';
			advanceTimer = setTimeout(
				() => onAnswer({ social: 2, coord: 1, risk: 1, tempo: 2 }),
				1000
			);
		} else if (outcome === 'closed') {
			void playSfx('elevator-shut');
			announcement = 'The close-door button is pressed. The doors shut.';
			advanceTimer = setTimeout(
				() => onAnswer({ social: -3, tempo: 2, coord: -1 }),
				700
			);
		} else {
			void playSfx('elevator-shut');
			// Freezing until the deadline decides for you is its own answer.
			announcement = 'The doors shut before the person reaches the elevator.';
			advanceTimer = setTimeout(
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
	}

	onMount(() => {
		duckMusic('elevator', 0.22);
		void playSfx('elevator-approach', { tag: 'elevator-scene' });
		// Wait one painted frame so CSS has an open-door starting position to
		// transition from. The decision window begins exactly when motion begins.
		startFrame = requestAnimationFrame(() => {
			phase = 'closing';
			announcement = 'Elevator doors are closing. A person is running toward the elevator.';
			deadline = setTimeout(() => resolve('timed-out'), DOOR_MS);
		});

		return () => {
			stopSfx('elevator-scene');
			clearMusicDuck('elevator');
			if (startFrame !== undefined) cancelAnimationFrame(startFrame);
			clearTimeout(deadline);
			clearTimeout(advanceTimer);
		};
	});
</script>

<div
	class="elevator"
	class:closing={phase === 'closing'}
	class:saved={phase === 'saved'}
	class:closed={phase === 'closed'}
	class:timed-out={phase === 'timed-out'}
	aria-describedby="elevator-scene"
>
	<p id="elevator-scene" class="sr-only">
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
				data-sfx="elevator-button"
				class:lit={phase === 'saved'}
				disabled={!active}
				aria-label="Hold elevator door open"
				onclick={() => resolve('saved')}
			>
				<span aria-hidden="true">◀&nbsp;▶</span>
			</button>
			<button
				class="door-button close-button"
				data-sfx="elevator-button"
				class:lit={phase === 'closed'}
				disabled={!active}
				aria-label="Close elevator door"
				onclick={() => resolve('closed')}
			>
				<span aria-hidden="true">▶&nbsp;◀</span>
			</button>
		</div>

		<div class="floor-buttons" role="group" aria-label="Floor buttons">
			{#each FLOORS as floorNumber}
				<button
					data-sfx="elevator-button"
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

	.door {
		position: absolute;
		z-index: 4;
		top: 0;
		bottom: 0;
		width: 50.4%;
		background: var(--accent-soft);
		transition: transform 6s linear;
		will-change: transform;
	}
	.door span {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--rule);
	}
	.door-left {
		left: 0;
		transform: translateX(-94%);
		border-right: 1px solid var(--ink);
		background: var(--accent-soft);
	}
	.door-left span {
		right: 18%;
	}
	.door-right {
		right: 0;
		transform: translateX(94%);
		border-left: 1px solid var(--ink);
		background: var(--border);
	}
	.door-right span {
		left: 18%;
	}
	.closing .door,
	.closed .door,
	.timed-out .door {
		transform: translateX(0);
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
	.closed .door {
		transition-duration: 0.32s;
		transition-timing-function: ease-in;
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

	.panel {
		position: absolute;
		z-index: 9;
		top: 13%;
		right: clamp(0.35rem, 1.8vw, 0.75rem);
		width: clamp(7.15rem, 26%, 8rem);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: clamp(0.45rem, 1.2vw, 0.65rem);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.display {
		order: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		height: 2.35rem;
		background: var(--surface);
		border: 1px solid var(--rule);
		color: var(--ink);
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
	}

	.floor-buttons {
		order: 2;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.38rem;
	}
	.floor-buttons button,
	.door-button {
		min-width: 0;
		min-height: 3rem;
		padding: 0;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			background 0.15s ease,
			border-color 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	.floor-buttons button:hover:not(:disabled),
	.door-button:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.floor-buttons button:active:not(:disabled),
	.door-button:active:not(:disabled) {
		transform: translateY(0);
	}
	.floor-buttons button:focus-visible,
	.door-button:focus-visible {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	.floor-buttons button.lit,
	.door-button.lit {
		background: var(--accent-soft);
		color: var(--ink);
		border-color: var(--ink);
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

	.door-controls {
		order: 3;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.38rem;
		padding-top: 0.12rem;
		border-top: 1px solid var(--border);
	}
	.door-button {
		min-height: 3.35rem;
		border-radius: var(--radius);
	}
	.door-button span {
		display: block;
		font-size: clamp(0.66rem, 2.2vw, 0.86rem);
		letter-spacing: -0.08em;
		white-space: nowrap;
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
			gap: 0.4rem;
			padding: 0.32rem;
		}
		.floor-buttons,
		.door-controls {
			gap: 0.28rem;
		}
		.floor-buttons button,
		.door-button {
			min-height: 3rem;
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
