<script>
	import { onMount } from 'svelte';
	import { levels } from '$lib/tetris/levels.js';
	import {
		COLS,
		ROWS,
		createBoard,
		annotatePassage,
		queueFromPassage,
		makePiece,
		collides,
		tryMove,
		tryRotate,
		dropRow,
		lockPiece,
		removeRows,
		scoreFor,
		cellsOf
	} from '$lib/tetris/engine.js';
	import { drawGlyph, drawGlyphText, glyphTextWidth, glyphFor, glyphWidth } from '$lib/tetris/glyphs.js';

	const CELL = 32; // board brick, css px
	const STRIP_CELL = 7; // passage strip brick
	const HUD_CELL = 5; // score digit brick
	const MUSIC_VOLUME = 0.55;
	const DUCKED_MUSIC_VOLUME = 0.3;
	const EFFECT_VOLUME = 0.36;
	const MOVE_EFFECT_VOLUME = 0.18;
	const ANNOUNCER_VOLUME = 0.5;
	const SOUND_FILES = {
		move: '/audio/tetris/hard-drop.mp3',
		rotate: '/audio/tetris/rotate.mp3',
		lock: '/audio/tetris/lock.mp3',
		clear: '/audio/tetris/clear.mp3',
		topout: '/audio/tetris/topout.mp3',
		complete: '/audio/tetris/complete.mp3',
		hardDrop: '/audio/tetris/move.mp3',
		double: '/audio/tetris/double.mp3',
		triple: '/audio/tetris/triple.mp3',
		tetris: '/audio/tetris/tetris.mp3'
	};
	/** @type {Partial<Record<number, keyof typeof SOUND_FILES>>} */
	const LINE_ANNOUNCEMENTS = { 2: 'double', 3: 'triple', 4: 'tetris' };

	// phase: intro | playing | paused | cleared | topout | fin
	let phase = $state('intro');
	let levelIndex = $state(0);
	let score = $state(0);
	let linesCleared = $state(0);
	let piecesPlaced = $state(0);

	const level = $derived(levels[levelIndex]);
	const strip = $derived(annotatePassage(levels[levelIndex].passage));
	const queue = $derived(queueFromPassage(levels[levelIndex].passage));
	const skippedLetters = $derived(
		[
			...new Set(
				strip
					.filter((entry) => !entry.space && !entry.playable && /[a-z]/i.test(entry.char))
					.map((entry) => entry.char.toLowerCase())
			)
		].sort()
	);

	/** @typedef {import('$lib/tetris/engine.js').Piece} Piece */

	// The live game state stays in plain locals — the loop touches it every
	// frame and only the HUD numbers above need reactivity.
	let board = createBoard();
	/** @type {Piece | null} */
	let piece = null;
	let queueIndex = 0;
	let scoreAtLevelStart = 0;
	let lastFall = 0;
	let softDropping = false;
	/** @type {number[]} */
	let flashRows = [];
	let flashUntil = 0;
	let rafId = 0;

	/** @type {HTMLCanvasElement} */
	let boardCanvas;
	/** @type {HTMLCanvasElement} */
	let stripCanvas;
	/** @type {HTMLCanvasElement} */
	let scoreCanvas;
	/** @type {HTMLCanvasElement} */
	let lettersCanvas;
	/** @type {HTMLCanvasElement} */
	let linesCanvas;
	/** @type {HTMLElement} */
	let stage;

	// Palette after hakanalpay.com: warm near-black paper, cream ink, mustard
	// seal. Filled from the stage element's custom properties on mount.
	let colors = {
		paper: 'oklch(0.19 0.012 72)',
		paper2: 'oklch(0.235 0.014 72)',
		ink: 'oklch(0.93 0.012 88)',
		inkFaint: 'oklch(0.55 0.012 82)',
		seal: 'oklch(0.82 0.158 92)'
	};

	// Level music: a plain looping element, created per level and kept in step
	// with the phase — playing only while the game is, silent on the overlays.
	// It sits deliberately below the generated effects in the game mix.
	/** @type {HTMLAudioElement | null} */
	let music = null;
	let soundOn = $state(true);
	/** @type {Map<keyof typeof SOUND_FILES, HTMLAudioElement>} */
	const soundBases = new Map();
	/** @type {Set<HTMLAudioElement>} */
	const activeSounds = new Set();
	let activeAnnouncements = 0;

	function stopMusic() {
		if (music) {
			music.pause();
			music = null;
		}
	}

	function syncMusic() {
		if (music && phase === 'playing' && soundOn) music.play().catch(() => {});
		else music?.pause();
	}

	function stopEffects() {
		for (const sound of activeSounds) {
			sound.pause();
			sound.currentTime = 0;
		}
		activeSounds.clear();
		activeAnnouncements = 0;
		if (music) music.volume = MUSIC_VOLUME;
	}

	$effect(() => {
		void phase;
		void soundOn;
		syncMusic();
		if (!soundOn) stopEffects();
	});

	/** @param {keyof typeof SOUND_FILES} kind */
	function sfx(kind) {
		if (!soundOn) return;
		const base = soundBases.get(kind);
		if (!base) return;
		const sound = /** @type {HTMLAudioElement} */ (base.cloneNode());
		sound.volume = kind === 'move' ? MOVE_EFFECT_VOLUME : EFFECT_VOLUME;
		activeSounds.add(sound);
		const forget = () => activeSounds.delete(sound);
		sound.addEventListener('ended', forget, { once: true });
		sound.addEventListener('error', forget, { once: true });
		sound.play().catch(forget);
	}

	/** @param {number} count */
	function announceLineClear(count) {
		if (!soundOn) return;
		const kind = LINE_ANNOUNCEMENTS[count];
		if (!kind) return;
		const base = soundBases.get(/** @type {keyof typeof SOUND_FILES} */ (kind));
		if (!base) return;

		const sound = /** @type {HTMLAudioElement} */ (base.cloneNode());
		sound.volume = ANNOUNCER_VOLUME;
		activeSounds.add(sound);
		activeAnnouncements += 1;
		if (music) music.volume = DUCKED_MUSIC_VOLUME;

		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			activeSounds.delete(sound);
			activeAnnouncements = Math.max(0, activeAnnouncements - 1);
			if (music && activeAnnouncements === 0) music.volume = MUSIC_VOLUME;
		};
		sound.addEventListener('ended', finish, { once: true });
		sound.addEventListener('error', finish, { once: true });
		sound.play().catch(finish);
	}

	/** @param {number} index */
	function startLevel(index) {
		levelIndex = index;
		stopMusic();
		if (levels[index].music) {
			music = new Audio(levels[index].music);
			music.loop = true;
			music.volume = MUSIC_VOLUME;
		}
		board = createBoard();
		queueIndex = 0;
		piecesPlaced = 0;
		scoreAtLevelStart = score;
		flashRows = [];
		piece = makePiece(queue[0]);
		queueIndex = 1;
		lastFall = performance.now();
		phase = 'playing';
		syncMusic();
	}

	function retryLevel() {
		score = scoreAtLevelStart;
		startLevel(levelIndex);
	}

	// Jump straight to a level from the picker: a fresh run from that passage.
	/** @param {number} index */
	function selectLevel(index) {
		stopMusic();
		levelIndex = index;
		board = createBoard();
		piece = null;
		queueIndex = 0;
		piecesPlaced = 0;
		score = 0;
		linesCleared = 0;
		scoreAtLevelStart = 0;
		flashRows = [];
		phase = 'intro';
	}

	function settlePiece() {
		if (!piece) return;
		const { board: settled, clearedRows, toppedOut } = lockPiece(board, piece);
		board = settled;
		score += cellsOf(piece.grid).length;
		piecesPlaced += 1;
		if (toppedOut) {
			piece = null;
			phase = 'topout';
			sfx('topout');
			return;
		}
		if (clearedRows.length > 0) {
			linesCleared += clearedRows.length;
			score += scoreFor(clearedRows.length, levelIndex + 1);
			flashRows = clearedRows;
			flashUntil = performance.now() + 140;
			board = removeRows(board, clearedRows);
			sfx('clear');
			announceLineClear(clearedRows.length);
		} else {
			sfx('lock');
		}
		if (queueIndex >= queue.length) {
			piece = null;
			phase = levelIndex + 1 < levels.length ? 'cleared' : 'fin';
			sfx('complete');
			return;
		}
		piece = makePiece(queue[queueIndex]);
		queueIndex += 1;
		if (collides(board, piece.grid, piece.row + 1, piece.col)) {
			// Nowhere to fall at all: the stack has reached the sky.
			phase = 'topout';
			piece = null;
			sfx('topout');
		}
	}

	function stepDown() {
		if (!piece) return;
		const moved = tryMove(board, piece, 1, 0);
		if (moved) piece = moved;
		else settlePiece();
	}

	function hardDrop() {
		if (!piece) return;
		piece = { ...piece, row: dropRow(board, piece) };
		sfx('hardDrop');
		// Keep the landing sound as well as the downward rush: the generated
		// hard-drop clip acknowledges Space immediately, while settlePiece adds
		// the weight of the block reaching the stack.
		settlePiece();
	}

	/** @param {number} now */
	function frame(now) {
		rafId = requestAnimationFrame(frame);
		if (phase === 'playing' && piece) {
			const interval = softDropping ? 45 : level.fallMs;
			if (now - lastFall >= interval) {
				lastFall = now;
				stepDown();
			}
		}
		draw(now);
	}

	/** @param {KeyboardEvent} event */
	function handleKey(event) {
		if (event.key === 'p' || event.key === 'P') {
			if (phase === 'playing') phase = 'paused';
			else if (phase === 'paused') {
				lastFall = performance.now();
				phase = 'playing';
			}
			return;
		}
		if (event.key === 'r' || event.key === 'R') {
			if (phase === 'playing' || phase === 'paused' || phase === 'topout') retryLevel();
			return;
		}
		if (phase !== 'playing' || !piece) return;
		switch (event.key) {
			case 'ArrowLeft': {
				const moved = tryMove(board, piece, 0, -1);
				if (moved) {
					piece = moved;
					sfx('move');
				}
				event.preventDefault();
				break;
			}
			case 'ArrowRight': {
				const moved = tryMove(board, piece, 0, 1);
				if (moved) {
					piece = moved;
					sfx('move');
				}
				event.preventDefault();
				break;
			}
			case 'ArrowDown':
				softDropping = true;
				event.preventDefault();
				break;
			case 'ArrowUp':
			case 'z':
			case 'Z': {
				const rotated = tryRotate(board, piece);
				if (rotated) {
					piece = rotated;
					sfx('rotate');
				}
				event.preventDefault();
				break;
			}
			case ' ':
				hardDrop();
				event.preventDefault();
				break;
		}
	}

	/** @param {KeyboardEvent} event */
	function handleKeyUp(event) {
		if (event.key === 'ArrowDown') softDropping = false;
	}

	// Touch: horizontal drag walks the piece column by column, a short tap
	// rotates, a decisive downward fling drops.
	/** @type {{x: number, y: number, startX: number, startY: number, at: number} | null} */
	let touch = null;
	/** @param {TouchEvent} event */
	function onTouchStart(event) {
		if (phase !== 'playing') return;
		const t = event.changedTouches[0];
		touch = { x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, at: performance.now() };
		event.preventDefault();
	}
	/** @param {TouchEvent} event */
	function onTouchMove(event) {
		if (!touch || phase !== 'playing' || !piece) return;
		const t = event.changedTouches[0];
		while (t.clientX - touch.x >= 24) {
			const moved = tryMove(board, piece, 0, 1);
			if (moved) {
				piece = moved;
				sfx('move');
			}
			touch.x += 24;
		}
		while (t.clientX - touch.x <= -24) {
			const moved = tryMove(board, piece, 0, -1);
			if (moved) {
				piece = moved;
				sfx('move');
			}
			touch.x -= 24;
		}
		event.preventDefault();
	}
	/** @param {TouchEvent} event */
	function onTouchEnd(event) {
		if (!touch || phase !== 'playing' || !piece) {
			touch = null;
			return;
		}
		const t = event.changedTouches[0];
		const dx = t.clientX - touch.startX;
		const dy = t.clientY - touch.startY;
		const dt = performance.now() - touch.at;
		if (dy > 60 && dt < 400) hardDrop();
		else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) {
			const rotated = tryRotate(board, piece);
			if (rotated) {
				piece = rotated;
				sfx('rotate');
			}
		}
		touch = null;
		event.preventDefault();
	}

	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {number} cssW
	 * @param {number} cssH
	 */
	function setupCanvas(canvas, cssW, cssH) {
		const dpr = window.devicePixelRatio || 1;
		canvas.width = cssW * dpr;
		canvas.height = cssH * dpr;
		canvas.style.width = `${cssW}px`;
		canvas.style.height = `${cssH}px`;
		const ctx = context(canvas);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	/** @param {HTMLCanvasElement} canvas */
	function context(canvas) {
		return /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
	}

	/** @param {number} now */
	function draw(now) {
		drawBoard(now);
		drawStrip();
		drawScore();
	}

	/** @param {number} now */
	function drawBoard(now) {
		const ctx = context(boardCanvas);
		const w = COLS * CELL;
		const h = ROWS * CELL;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = colors.paper2;
		ctx.fillRect(0, 0, w, h);

		// Hairline grid, like a compositor's galley.
		ctx.strokeStyle = colors.ink;
		ctx.globalAlpha = 0.07;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let c = 1; c < COLS; c++) {
			ctx.moveTo(c * CELL + 0.5, 0);
			ctx.lineTo(c * CELL + 0.5, h);
		}
		for (let r = 1; r < ROWS; r++) {
			ctx.moveTo(0, r * CELL + 0.5);
			ctx.lineTo(w, r * CELL + 0.5);
		}
		ctx.stroke();
		ctx.globalAlpha = 1;

		// Settled type: each letter keeps its own tone (cycled from its position
		// in the passage), so boundaries between settled letters stay readable
		// instead of merging into one slab.
		const TONES = [0.94, 0.72, 0.55, 0.84, 0.63];
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const pieceId = board[r][c];
				if (pieceId === null) continue;
				ctx.fillStyle = colors.ink;
				ctx.globalAlpha = TONES[pieceId % TONES.length];
				ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
			}
		}
		ctx.globalAlpha = 1;

		if (piece && phase !== 'topout') {
			// Ghost: where the letter will land.
			const ghostRow = dropRow(board, piece);
			ctx.strokeStyle = colors.seal;
			ctx.globalAlpha = 0.4;
			for (const cell of cellsOf(piece.grid)) {
				const r = ghostRow + cell.r;
				if (r < 0) continue;
				ctx.strokeRect((piece.col + cell.c) * CELL + 1.5, r * CELL + 1.5, CELL - 3, CELL - 3);
			}
			ctx.globalAlpha = 1;
			// The live letter carries the accent; it settles into cream.
			ctx.fillStyle = colors.seal;
			for (const cell of cellsOf(piece.grid)) {
				const r = piece.row + cell.r;
				if (r < 0) continue;
				ctx.fillRect((piece.col + cell.c) * CELL, r * CELL, CELL, CELL);
			}
		}

		if (now < flashUntil) {
			ctx.fillStyle = colors.ink;
			ctx.globalAlpha = 0.85;
			for (const r of flashRows) {
				ctx.fillRect(0, r * CELL, w, CELL);
			}
			ctx.globalAlpha = 1;
		}

		ctx.strokeStyle = colors.ink;
		ctx.globalAlpha = 0.18;
		ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
		ctx.globalAlpha = 1;
	}

	// The passage, typeset in the font itself, sliding so the letter being
	// dropped sits under the caret. Characters the font doesn't draw are
	// simply left out — only real glyphs and word gaps appear.
	function drawStrip() {
		const ctx = context(stripCanvas);
		const w = stripCanvas.clientWidth;
		const h = stripCanvas.clientHeight;
		ctx.clearRect(0, 0, w, h);

		const currentStripIndex =
			phase === 'cleared' || phase === 'fin'
				? strip.length
				: (piece?.stripIndex ?? queue[Math.min(queueIndex, queue.length - 1)]?.stripIndex ?? 0);

		// Advance widths per strip entry; undrawn characters take no room.
		const advances = strip.map((entry) => {
			if (entry.space) return STRIP_CELL * 3;
			const grid = glyphFor(entry.char);
			if (!entry.playable || !grid) return 0;
			return (glyphWidth(grid) + 1) * STRIP_CELL;
		});
		let xOfCurrent = 0;
		for (let i = 0; i < currentStripIndex && i < strip.length; i++) xOfCurrent += advances[i];

		const anchor = w * 0.35;
		let x = Math.min(anchor - xOfCurrent, 8);
		const top = 8;
		for (let i = 0; i < strip.length; i++) {
			const entry = strip[i];
			if (x > w) break;
			const grid = entry.playable ? glyphFor(entry.char) : null;
			if (grid && x + advances[i] > 0) {
				const done = i < currentStripIndex;
				ctx.fillStyle = i === currentStripIndex ? colors.seal : colors.ink;
				ctx.globalAlpha = done ? 0.28 : i === currentStripIndex ? 1 : 0.8;
				drawGlyph(ctx, grid, x, top, STRIP_CELL);
				ctx.globalAlpha = 1;
				if (i === currentStripIndex) {
					ctx.fillStyle = colors.seal;
					ctx.fillRect(x, top + STRIP_CELL * 3 + 5, glyphWidth(grid) * STRIP_CELL, 3);
				}
			}
			x += advances[i];
		}
	}

	/** @param {HTMLCanvasElement} canvas @param {string} text */
	function drawHudCounter(canvas, text) {
		const ctx = context(canvas);
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = colors.ink;
		drawGlyphText(ctx, text, w - glyphTextWidth(text, HUD_CELL), 2, HUD_CELL);
	}

	function drawScore() {
		drawHudCounter(scoreCanvas, String(score));
		drawHudCounter(lettersCanvas, `${Math.min(piecesPlaced, queue.length)} of ${queue.length}`);
		drawHudCounter(linesCanvas, String(linesCleared));
	}

	onMount(() => {
		for (const [kind, source] of Object.entries(SOUND_FILES)) {
			const sound = new Audio(source);
			sound.preload = 'auto';
			soundBases.set(/** @type {keyof typeof SOUND_FILES} */ (kind), sound);
		}
		const styles = getComputedStyle(stage);
		colors = {
			paper: styles.getPropertyValue('--paper').trim() || colors.paper,
			paper2: styles.getPropertyValue('--paper-2').trim() || colors.paper2,
			ink: styles.getPropertyValue('--t-ink').trim() || colors.ink,
			inkFaint: styles.getPropertyValue('--ink-faint').trim() || colors.inkFaint,
			seal: styles.getPropertyValue('--seal').trim() || colors.seal
		};
		setupCanvas(boardCanvas, COLS * CELL, ROWS * CELL);
		setupCanvas(stripCanvas, (stripCanvas.parentElement?.clientWidth ?? 302) - 2, 40);
		setupCanvas(scoreCanvas, 132, 19);
		setupCanvas(lettersCanvas, 132, 19);
		setupCanvas(linesCanvas, 132, 19);

		const onVisibility = () => {
			if (document.hidden && phase === 'playing') phase = 'paused';
		};
		document.addEventListener('visibilitychange', onVisibility);
		rafId = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(rafId);
			document.removeEventListener('visibilitychange', onVisibility);
			stopMusic();
			stopEffects();
			soundBases.clear();
		};
	});
</script>

<svelte:head>
	<title>kaiski tetris</title>
	<meta
		name="description"
		content="Tetris where every falling piece is a letter of kimeiga's kaiski typeface and every level typesets one of his essays."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://random-tau-two.vercel.app/tetris" />
	<meta property="og:title" content="kaiski tetris" />
	<meta
		property="og:description"
		content="Tetris where every falling piece is a letter of kimeiga's kaiski typeface and every level typesets one of his essays."
	/>
	<meta property="og:image" content="https://random-tau-two.vercel.app/images/tetris-social.png" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="Pixel-art portrait of Hakan Alpay beside the words kai ski tetris"
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="kaiski tetris" />
	<meta
		name="twitter:description"
		content="Tetris where every falling piece is a letter of kimeiga's kaiski typeface."
	/>
	<meta name="twitter:image" content="https://random-tau-two.vercel.app/images/tetris-social.png" />
	<meta
		name="twitter:image:alt"
		content="Pixel-art portrait of Hakan Alpay beside the words kai ski tetris"
	/>
</svelte:head>

<svelte:window onkeydown={handleKey} onkeyup={handleKeyUp} />

<div class="stage" bind:this={stage}>
	<main>
		<header class="masthead">
			<nav aria-label="Breadcrumb"><a class="back" href="/">← Index</a></nav>
			<h1>
				kaiski <em>tetris</em>
				<span class="gloss" aria-hidden="true">テトリス</span>
			</h1>
		</header>

		<section class="level-line">
			<span class="level-label">Level</span>
			<nav class="level-picker" aria-label="Level select">
				{#each levels as entry, i (entry.url)}
					<button
						class="level-btn"
						class:active={i === levelIndex}
						aria-current={i === levelIndex ? 'true' : undefined}
						onclick={() => selectLevel(i)}
					>
						{i + 1}
					</button>
				{/each}
			</nav>
			<span class="level-title">“{level.title}”</span>
			<a class="essay-link" href={level.url} target="_blank" rel="noopener">read the essay ↗</a>
		</section>

		<div class="strip-frame">
			<canvas bind:this={stripCanvas} aria-hidden="true"></canvas>
		</div>

		<section class="table">
			<div class="board-frame">
				<canvas
					bind:this={boardCanvas}
					class="board"
					ontouchstart={onTouchStart}
					ontouchmove={onTouchMove}
					ontouchend={onTouchEnd}
					aria-label="tetris board"
				></canvas>

				{#if phase !== 'playing'}
					<div class="overlay">
						{#if phase === 'intro'}
							<p class="overlay-kicker">Level {levelIndex + 1}</p>
							<h2>“{level.title}”</h2>
							<p class="overlay-note">
								The essay’s opening paragraph falls letter by letter, in order.
								{#if skippedLetters.length > 0}
									The font never drew
									{#each skippedLetters as letter, i (letter)}{i > 0 ? ', ' : ' '}<strong>{letter}</strong
										>{/each} — those are skipped.
								{/if}
							</p>
							<button onclick={() => startLevel(levelIndex)}>Begin setting</button>
							<p class="controls">← → move · ↑ rotate · ↓ soften · space drop · p pause</p>
						{:else if phase === 'paused'}
							<h2>Paused</h2>
							<button
								onclick={() => {
									lastFall = performance.now();
									phase = 'playing';
								}}>Resume</button
							>
						{:else if phase === 'cleared'}
							<p class="overlay-kicker">Passage set</p>
							<h2>“{level.title}”</h2>
							<p class="overlay-note">{piecesPlaced} letters placed · {linesCleared} lines cleared so far</p>
							<button onclick={() => startLevel(levelIndex + 1)}>Next level</button>
						{:else if phase === 'topout'}
							<p class="overlay-kicker">The galley overflowed</p>
							<h2>Out of sorts</h2>
							<button onclick={retryLevel}>Reset the passage</button>
						{:else if phase === 'fin'}
							<p class="overlay-kicker">All three passages set</p>
							<h2>fin</h2>
							<p class="overlay-note">Final score {score} · {linesCleared} lines</p>
							<button
								onclick={() => {
									score = 0;
									linesCleared = 0;
									levelIndex = 0;
									phase = 'intro';
								}}>Set them again</button
							>
						{/if}
					</div>
				{/if}
			</div>

			<aside class="panel">
				<div class="stat">
					<p class="stat-label">Score</p>
					<canvas bind:this={scoreCanvas} aria-label={`Score ${score}`}></canvas>
				</div>
				<div class="stat">
					<p class="stat-label">Letters</p>
					<canvas
						bind:this={lettersCanvas}
						aria-label={`${Math.min(piecesPlaced, queue.length)} of ${queue.length} letters`}
					></canvas>
				</div>
				<div class="stat">
					<p class="stat-label">Lines</p>
					<canvas bind:this={linesCanvas} aria-label={`${linesCleared} lines`}></canvas>
				</div>
				<div class="stat">
					<p class="stat-label">Sound</p>
					<button class="music-toggle" onclick={() => (soundOn = !soundOn)}>
						{soundOn ? 'on' : 'off'}
					</button>
				</div>
			</aside>
		</section>

		<footer>
			<hr class="hairline" />
			<p class="colophon">
				Type: <a href="https://fontstruct.com/fontstructions/show/2898352">kaiski 2x3</a> by kimeiga,
				FontStruct · Words: <a href="https://deltastar.substack.com">delta galaxy</a> · Look:
				<a href="https://hakanalpay.com">hakanalpay.com</a>
			</p>
		</footer>
	</main>
</div>

<style>
	/* A dark room borrowed from hakanalpay.com — deliberately single-theme.
	   Tokens mirror that site's: paper (warm near-black), ink (cream),
	   seal (mustard). --t-ink avoids colliding with the app-wide --ink. */
	.stage {
		--paper: oklch(0.19 0.012 72);
		--paper-2: oklch(0.235 0.014 72);
		--paper-edge: oklch(0.3 0.016 74);
		--t-ink: oklch(0.93 0.012 88);
		--ink-soft: oklch(0.74 0.012 86);
		--ink-faint: oklch(0.55 0.012 82);
		--seal: oklch(0.82 0.158 92);
		--t-rule: color-mix(in oklch, var(--t-ink) 18%, transparent);
		--font-display: 'SangBleu Empire', 'Iowan Old Style', Georgia, serif;
		--font-ui: 'Space Grotesk', 'Helvetica Neue', system-ui, sans-serif;

		background: var(--paper);
		color: var(--t-ink);
		font-family: var(--font-ui);
		min-height: 100dvh;
	}

	main {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(2rem, 7vh, 4.5rem) 1.25rem 3rem;
	}

	.masthead {
		animation: rise 0.6s ease both;
	}

	.back {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--ink-faint);
		text-decoration: none;
	}
	.back:hover,
	.back:focus-visible {
		color: var(--seal);
	}

	h1 {
		position: relative;
		margin: 1.6rem 0 1.1rem;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: clamp(2.6rem, 9vw, 4.6rem);
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--t-ink);
		text-shadow: none;
		text-wrap: balance;
	}

	h1 em {
		font-style: italic;
		color: var(--seal);
	}

	.gloss {
		position: absolute;
		right: 0;
		bottom: 0.4em;
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 400;
		letter-spacing: 0.4em;
		color: var(--ink-faint);
	}

	.level-line {
		margin-top: 2rem;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.9rem;
		border-top: 1px solid var(--t-rule);
		padding-top: 0.8rem;
	}
	.level-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--ink-faint);
	}
	.level-picker {
		display: flex;
		gap: 0.35rem;
	}
	.level-btn {
		width: 1.7rem;
		height: 1.7rem;
		display: grid;
		place-items: center;
		border: 1px solid var(--t-rule);
		background: transparent;
		color: var(--ink-soft);
		font-family: var(--font-ui);
		font-size: 0.78rem;
		cursor: pointer;
		border-radius: 0;
		transition: border-color 140ms ease, color 140ms ease;
	}
	.level-btn:hover {
		border-color: var(--seal);
		color: var(--seal);
	}
	.level-btn.active {
		border-color: var(--seal);
		background: var(--seal);
		color: var(--paper);
	}
	.level-btn:focus-visible {
		outline: 2px solid var(--seal);
		outline-offset: 2px;
	}
	.level-title {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.15rem;
	}
	.essay-link {
		margin-left: auto;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--seal);
		text-decoration: none;
	}
	.essay-link:hover,
	.essay-link:focus-visible {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.strip-frame {
		margin-top: 0.9rem;
		border: 1px solid var(--t-rule);
		background: var(--paper-2);
		overflow: hidden;
	}
	.strip-frame canvas {
		display: block;
	}

	.table {
		margin-top: 1.1rem;
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		justify-content: center;
	}

	.board-frame {
		position: relative;
		flex-shrink: 0;
	}

	.board {
		display: block;
		touch-action: none;
		max-width: 100%;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		padding: 1.5rem;
		text-align: center;
		background: color-mix(in oklch, var(--paper) 88%, transparent);
		backdrop-filter: blur(2px);
	}

	.overlay h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.55rem;
		line-height: 1.15;
		color: var(--t-ink);
		text-shadow: none;
		text-wrap: balance;
	}

	.overlay-kicker {
		margin: 0;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--seal);
	}

	.overlay-note {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--ink-soft);
	}
	.overlay-note strong {
		color: var(--t-ink);
	}

	.overlay button {
		margin-top: 0.4rem;
		padding: 0.6rem 1.3rem;
		border: 1px solid var(--t-ink);
		background: transparent;
		color: var(--t-ink);
		font-family: var(--font-ui);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		cursor: pointer;
		border-radius: 0;
		transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
	}
	.overlay button:hover {
		background: var(--seal);
		border-color: var(--seal);
		color: var(--paper);
	}
	.overlay button:focus-visible {
		outline: 2px solid var(--seal);
		outline-offset: 3px;
	}

	.controls {
		margin: 0.6rem 0 0;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: var(--ink-faint);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
		min-width: 150px;
	}

	.stat {
		border-top: 1px solid var(--t-rule);
		padding-top: 0.55rem;
	}

	.stat-label {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--ink-faint);
	}

	.stat canvas {
		display: block;
	}

	.music-toggle {
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--t-rule);
		background: transparent;
		color: var(--t-ink);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		cursor: pointer;
		border-radius: 0;
	}
	.music-toggle:hover {
		border-color: var(--seal);
		color: var(--seal);
	}
	.music-toggle:focus-visible {
		outline: 2px solid var(--seal);
		outline-offset: 2px;
	}

	footer {
		margin-top: 3rem;
	}

	.hairline {
		border: none;
		border-top: 1px solid var(--t-rule);
		margin: 0;
	}

	.colophon {
		margin: 0.8rem 0 0;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		color: var(--ink-faint);
		text-align: center;
	}
	.colophon a {
		color: var(--ink-soft);
		text-decoration-color: var(--seal);
		text-underline-offset: 3px;
	}
	.colophon a:hover,
	.colophon a:focus-visible {
		color: var(--seal);
	}

	@media (max-width: 560px) {
		.table {
			flex-direction: column;
		}
		.panel {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 1rem 1.5rem;
			min-width: 0;
			width: 100%;
		}
		.stat {
			border-top: none;
			padding-top: 0;
		}
		.gloss {
			display: none;
		}
	}
</style>
