<script>
	// scene-recall, recreate branch — the gauntlet for anyone who claimed, in the
	// strongest terms, that their memory is excellent. They named no faculty, so
	// the quiz takes the boast at face value and asks for everything: here are the
	// pieces of the scene, put them back where they were.
	//
	// Drag mechanics are the pack-box grid, simplified to single-cell items —
	// gridMetrics()/cellFromPoint() and the measured-px ghost are the exact
	// machinery hardened earlier this session, reused rather than reinvented.
	// The tray sprites were extracted from the SAME master illustration as the
	// scene plate, so a piece keeps the lighting and visual language it had there.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	import { recordDraft, recordEvent } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import SceneProp from './SceneProp.svelte';
	import { COLS, PROBES, PROPS, ROWS } from './sceneModel.js';

	let { onAnswer, unseen = false } = $props();

	const PROMPT = PROBES.recreate.prompt;

	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), layout: c.block(), done: c.action() };
	})();

	// Fixed scramble, so the tray never hints the layout by grouping a column
	// together, and so it is stable rather than reshuffling on every keystroke.
	const TRAY = [
		'bicycle', 'sign', 'meteor', 'door', 'postbox', 'window', 'bus', 'mat',
		'clock', 'crate', 'lamp', 'board', 'cat', 'poster', 'stop'
	].map((id) => /** @type {typeof PROPS[number]} */ (PROPS.find((p) => p.id === id)));

	/** @param {string} id */
	const byId = (id) => /** @type {typeof PROPS[number]} */ (PROPS.find((p) => p.id === id));

	/** @type {Record<string, {col: number, row: number}>} */
	let placements = $state({});
	/** @type {{id: string, x: number, y: number} | null} */
	let dragging = $state(null);
	/** @type {{col: number, row: number, valid: boolean} | null} */
	let preview = $state(null);
	/** @type {{cell: number, gap: number}} */
	let ghostScale = $state({ cell: 40, gap: 6 });
	let committed = $state(false);

	/** @type {HTMLElement} */
	let gridEl;

	const pooled = $derived(TRAY.filter((p) => !(p.id in placements) && dragging?.id !== p.id));
	const placedCount = $derived(Object.keys(placements).length);

	function occupied() {
		const occ = new Set();
		for (const at of Object.values(placements)) occ.add(`${at.col},${at.row}`);
		return occ;
	}

	/** @param {number} col @param {number} row */
	function canPlace(col, row) {
		return (
			col >= 0 && col < COLS && row >= 0 && row < ROWS && !occupied().has(`${col},${row}`)
		);
	}

	// Grid geometry in px, measured off the live element — the container-query
	// `--cell` only resolves inside .grid, so the ghost is told the number and the
	// hit-test reads the same one. Identical to pack-box.
	function gridMetrics() {
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const cs = getComputedStyle(gridEl);
		const px = (/** @type {string} */ v) => parseFloat(v) || 0;
		const gapX = px(cs.columnGap);
		const gapY = px(cs.rowGap);
		const innerW =
			rect.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight);
		const innerH =
			rect.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom);
		const cellW = (innerW - (COLS - 1) * gapX) / COLS;
		const cellH = (innerH - (ROWS - 1) * gapY) / ROWS;
		if (!(cellW > 0) || !(cellH > 0)) return null;
		return {
			rect,
			originX: rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
			originY: rect.top + px(cs.borderTopWidth) + px(cs.paddingTop),
			gapX,
			gapY,
			cellW,
			cellH
		};
	}

	/** @param {number} x @param {number} y */
	function cellFromPoint(x, y) {
		const m = gridMetrics();
		if (!m) return null;
		const { rect } = m;
		if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
		return {
			col: Math.max(0, Math.min(COLS - 1, Math.floor((x - m.originX) / (m.cellW + m.gapX)))),
			row: Math.max(0, Math.min(ROWS - 1, Math.floor((y - m.originY) / (m.cellH + m.gapY))))
		};
	}

	/** @param {number} x @param {number} y */
	function updatePreview(x, y) {
		const cell = dragging ? cellFromPoint(x, y) : null;
		preview = cell ? { ...cell, valid: canPlace(cell.col, cell.row) } : null;
	}

	/** @param {PointerEvent} e @param {string} id */
	function startDrag(e, id) {
		if (committed) return;
		e.preventDefault();
		if (id in placements) {
			const { [id]: _, ...rest } = placements;
			placements = rest;
		}
		const m = gridMetrics();
		if (m) ghostScale = { cell: m.cellW, gap: m.gapX };
		dragging = { id, x: e.clientX, y: e.clientY };
		void playSfx('drag-pickup');
		updatePreview(e.clientX, e.clientY);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}
	/** @param {PointerEvent} e */
	function onMove(e) {
		if (!dragging) return;
		dragging = { ...dragging, x: e.clientX, y: e.clientY };
		updatePreview(e.clientX, e.clientY);
	}
	function onUp() {
		const valid = !!dragging && !!preview?.valid;
		if (dragging && preview?.valid) {
			placements = { ...placements, [dragging.id]: { col: preview.col, row: preview.row } };
		}
		if (dragging) void playSfx(valid ? 'drop-valid' : 'drop-invalid');
		dragging = null;
		preview = null;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
	}

	/** @param {number} col @param {number} row */
	function cellState(col, row) {
		if (!dragging || !preview) return '';
		return preview.col === col && preview.row === row ? (preview.valid ? 'ok' : 'bad') : '';
	}

	function done() {
		if (committed) return;
		committed = true;
		// Correct = the piece is back on its own cell. Everything is derived from
		// PROPS, so there is no separate answer key to drift.
		let correct = 0;
		for (const [id, at] of Object.entries(placements)) {
			const home = byId(id).cell;
			if (home[0] === at.col && home[1] === at.row) correct += 1;
		}
		const f = correct / PROPS.length;
		recordDraft({ format: 'scene-recreate', value: placements, label: `${correct}/${PROPS.length}` });
		recordEvent('scene-recreate', { correct, total: PROPS.length, placed: placedCount, unseen });

		// A deep-link never saw the scene, so it is not billed. Otherwise the
		// ladder mirrors pack-box: a perfect rebuild is the boast vindicated; a
		// near-empty one is it collapsing. scope runs negative = detail-oriented.
		/** @type {Record<string, number>} */
		let delta = {};
		if (!unseen) {
			if (f === 1) delta = { scope: -3, honesty: 3 };
			else if (f >= 0.7) delta = { scope: -2, honesty: 1 };
			else if (f >= 0.4) delta = { scope: -1 };
			else delta = { scope: 2, honesty: -2 };
		}
		setTimeout(() => onAnswer(delta), 700);
	}
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} />

<div class="recreate">
	<h2><SplitText text={PROMPT} stagger={40} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="layout" style="animation-delay: {seq.layout}ms">
		<div class="pack">
			<p class="pack-label">{placedCount} of {PROPS.length} placed</p>
			<div class="grid" bind:this={gridEl} style="--rows: {ROWS}; --cols: {COLS};">
				{#each Array(ROWS * COLS) as _, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="cell {cellState(i % COLS, Math.floor(i / COLS))}"></div>
				{/each}
				{#each Object.entries(placements) as [id, at] (id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="placed"
						style="--c: {at.col}; --r: {at.row};"
						title={byId(id).article}
						onpointerdown={(e) => startDrag(e, id)}
					>
						<SceneProp {id} label={byId(id).article} />
					</div>
				{/each}
			</div>
		</div>

		<div class="supply">
			<p class="pack-label">The pieces</p>
			<div class="pool">
				{#each pooled as p (p.id)}
					<div class="pool-item" data-reader-option={p.article}>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="pool-sprite" title={p.article} onpointerdown={(e) => startDrag(e, p.id)}>
							<SceneProp id={p.id} label={p.article} />
						</div>
					</div>
				{/each}
				{#if pooled.length === 0}
					<p class="pack-label empty">Every piece is placed.</p>
				{/if}
			</div>
		</div>
	</div>

	{#if dragging}
		<div
			class="ghost"
			style="--cell: {ghostScale.cell}px; left: {dragging.x}px; top: {dragging.y}px;"
		>
			<SceneProp id={dragging.id} label={byId(dragging.id).article} />
		</div>
	{/if}

	<div class="actions" style="animation-delay: {seq.done}ms">
		<SubmitAnswer
			{committed}
			label="That's how it was →"
			committedLabel="Filed."
			onsubmit={done}
		/>
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.recreate > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	.layout {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 1.75rem;
		animation: rise 0.42s both;
	}
	.pack-label {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.68rem;
		color: var(--muted);
		margin: 0 0 0.6rem;
	}
	.pack-label.empty {
		text-transform: none;
		letter-spacing: normal;
		font-style: italic;
	}
	/* Container-query cell — never wider than the card, never past the desktop
	   size. Same approach and the same reason as pack-box's grid. */
	.pack {
		container-type: inline-size;
		-webkit-user-select: none;
		user-select: none;
	}
	.grid {
		--gap: clamp(4px, 1.2cqw, 6px);
		position: relative;
		display: grid;
		--cell: min(3.2rem, calc((100cqw - (var(--cols) + 1) * var(--gap) - 2px) / var(--cols)));
		grid-template-columns: repeat(var(--cols), var(--cell));
		grid-template-rows: repeat(var(--rows), var(--cell));
		gap: var(--gap);
		padding: var(--gap);
		border: 1px solid var(--rule);
		background: var(--accent-soft);
		touch-action: none;
		width: max-content;
		margin: 0 auto;
	}
	.cell {
		border: 1px dashed var(--rule);
		background: var(--surface);
	}
	.cell.ok {
		background: #e4e9e2;
		border-style: solid;
		border-color: #7d8a78;
	}
	.cell.bad {
		background: #ece2e0;
		border-style: solid;
		border-color: #a08880;
	}
	.placed {
		position: absolute;
		left: calc(var(--gap) + var(--c) * (var(--cell) + var(--gap)));
		top: calc(var(--gap) + var(--r) * (var(--cell) + var(--gap)));
		width: var(--cell);
		height: var(--cell);
		color: var(--ink);
		cursor: grab;
		touch-action: none;
		background: var(--surface);
		border: 1px solid var(--ink);
	}
	.placed :global(.scene-prop),
	.pool-sprite :global(.scene-prop),
	.ghost :global(.scene-prop) {
		width: 100%;
		height: 100%;
		display: block;
		padding: 0.1rem;
		box-sizing: border-box;
	}
	.supply {
		min-width: 0;
	}
	.pool {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: flex-start;
	}
	.pool-item {
		display: flex;
	}
	.pool-sprite {
		width: 3rem;
		height: 3rem;
		color: var(--ink);
		cursor: grab;
		touch-action: none;
		border: 1px solid var(--rule);
		background: var(--surface);
	}
	.ghost {
		position: fixed;
		width: var(--cell);
		height: var(--cell);
		transform: translate(-50%, -50%) rotate(-3deg);
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--ink);
		pointer-events: none;
		z-index: 10;
		filter: drop-shadow(0 0.4rem 0.35rem rgba(0, 0, 0, 0.18));
	}
	.actions {
		animation: rise 0.42s both;
	}
</style>
