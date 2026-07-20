<script>
	// pack-box — inventory-Tetris moving box. A 3×4 grid; items are Tetris-ish
	// shapes (1×1 up to 2×2 and an L) dragged from the pile into the box. There
	// is more stuff than box — what you choose to keep is the answer, and the
	// packed list carries over to airport-discard via the shared box state.
	//
	// The grid is deliberately too small for the pile. Sentimental items are the
	// expensive ones (the album eats two slots, the guitar three), so keeping
	// what matters to you costs you the things that are useful, and the question
	// never says which is correct.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { ITEMS } from './boxItems.js';
	import { box } from './boxState.svelte.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	const PROMPT = 'One box is going with you. What do you take?';

	let { onAnswer } = $props();

	// prompt → rule → grid → "grab it and go" (last, per $lib/reveal.js).
	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), layout: c.block(), leave: c.action() };
	})();

	// 6 × 8 = 48 cells, which is EXACTLY the total footprint of the sixteen
	// pieces in boxItems.js. Everything fits. See the note in that file before
	// touching either number — the pair is a solved exact-cover problem, not a
	// pair of layout choices.
	const ROWS = 6;
	const COLS = 8;

	/** @type {Record<string, {row: number, col: number}>} */
	let placements = $state({});
	/** @type {{id: string, x: number, y: number} | null} */
	let dragging = $state(null);
	/** @type {{row: number, col: number, valid: boolean} | null} */
	let preview = $state(null);
	let committed = $state(false);

	/** @type {HTMLElement} */
	let gridEl;

	/** @param {string} id */
	const byId = (id) => /** @type {typeof ITEMS[number]} */ (ITEMS.find((it) => it.id === id));
	/** @param {typeof ITEMS[number]} item */
	const bbox = (item) => ({
		h: Math.max(...item.cells.map(([r]) => r)) + 1,
		w: Math.max(...item.cells.map(([, c]) => c)) + 1
	});

	const pooled = $derived(ITEMS.filter((it) => !(it.id in placements) && dragging?.id !== it.id));
	const usedCells = $derived(
		Object.keys(placements).reduce((n, id) => n + byId(id).cells.length, 0)
	);

	function occupied() {
		const occ = new Set();
		for (const [id, at] of Object.entries(placements)) {
			for (const [r, c] of byId(id).cells) occ.add(`${at.row + r},${at.col + c}`);
		}
		return occ;
	}

	/** @param {string} id @param {number} row @param {number} col */
	function canPlace(id, row, col) {
		const occ = occupied();
		return byId(id).cells.every(([r, c]) => {
			const rr = row + r;
			const cc = col + c;
			return rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && !occ.has(`${rr},${cc}`);
		});
	}

	/** @param {number} x @param {number} y */
	function cellFromPoint(x, y) {
		const rect = gridEl.getBoundingClientRect();
		if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
		return {
			row: Math.min(ROWS - 1, Math.floor(((y - rect.top) / rect.height) * ROWS)),
			col: Math.min(COLS - 1, Math.floor(((x - rect.left) / rect.width) * COLS))
		};
	}

	/** @param {number} x @param {number} y */
	function updatePreview(x, y) {
		const active = dragging;
		const cell = active ? cellFromPoint(x, y) : null;
		preview = cell && active ? { ...cell, valid: canPlace(active.id, cell.row, cell.col) } : null;
	}

	/** @param {PointerEvent} e @param {string} id */
	function startDrag(e, id) {
		if (committed) return;
		e.preventDefault();
		if (id in placements) {
			// Already in the box — taking it back out (or repositioning it) is a
			// change of mind. Dragging from the pile is not.
			const { [id]: _, ...rest } = placements;
			placements = rest;
		}
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
			placements = { ...placements, [dragging.id]: { row: preview.row, col: preview.col } };
			recordDraft({ format: 'configuration', value: placements, labels: Object.keys(placements).map((id) => byId(id).name) });
		}
		if (dragging) void playSfx(valid ? 'drop-valid' : 'drop-invalid');
		dragging = null;
		preview = null;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
	}

	/** @param {number} row @param {number} col */
	function cellState(row, col) {
		const active = dragging;
		const target = preview;
		if (!active || !target) return '';
		const covers = byId(active.id).cells.some(
			([r, c]) => target.row + r === row && target.col + c === col
		);
		return covers ? (target.valid ? 'ok' : 'bad') : '';
	}

	// Where to draw a placed piece's icon: the occupied cell nearest the middle
	// of its footprint.
	//
	// The artwork used to be stretched across the whole bounding box and then
	// masked to the occupied cells. That kept ink from spilling into empty
	// squares, but on the L, S and plus shapes it sliced the drawing into
	// unreadable fragments — the sprites are composed for a rectangle, and half
	// of each one fell in a cell that is not part of the piece. Drawing a single
	// cell-sized icon instead is always legible and can never overhang a
	// neighbour; the bordered tiles carry the shape, which is what the puzzle
	// actually needs them to do.
	/** @param {{cells: number[][]}} item */
	function iconSpot(item) {
		const mid = item.cells.reduce((a, [r, c]) => [a[0] + r / item.cells.length, a[1] + c / item.cells.length], [0, 0]);
		let best = item.cells[0];
		let bestD = Infinity;
		for (const [r, c] of item.cells) {
			const d = (r - mid[0]) ** 2 + (c - mid[1]) ** 2;
			if (d < bestD) { bestD = d; best = [r, c]; }
		}
		return best;
	}

	function leave() {
		if (committed) return;
		committed = true;
		box.items = Object.keys(placements);
		recordDraft({
			format: 'configuration',
			value: placements,
			labels: box.items.map((id) => byId(id).name)
		});

		// The belongings still score — what someone chooses to save when they
		// think they must choose is worth reading.
		/** @type {Record<string, number>} */
		const total = {};
		for (const id of Object.keys(placements)) {
			for (const [k, v] of Object.entries(byId(id).score)) total[k] = (total[k] ?? 0) + v;
		}

		// …but the puzzle scores on top, and harder, because it is the part with
		// a right answer. Filling the grid completely is not luck: it takes
		// noticing that everything fits, and then staying with it.
		const filled = usedCells / (ROWS * COLS);
		const add = (/** @type {string} */ axis, /** @type {number} */ n) =>
			(total[axis] = (total[axis] ?? 0) + n);
		if (filled === 1) {
			add('scope', -3);
			add('creative', 3);
			add('tempo', -2);
		} else if (filled >= 0.85) {
			add('scope', -2);
			add('creative', 2);
			add('tempo', -1);
		} else if (filled >= 0.6) {
			add('creative', 1);
		} else if (filled <= 0.35) {
			// Barely engaged with it. Broad strokes, quick exit.
			add('scope', 2);
			add('tempo', 2);
		}
		// Keep any one question from dominating an axis.
		for (const k of Object.keys(total)) total[k] = Math.max(-3, Math.min(3, total[k]));

		setTimeout(() => onAnswer(total), 1100);
	}
</script>

<div class="movebox">
	<p class="premise">
		It has been a hard few months, and it ends with you having to be out of the apartment by
		tonight. A friend is driving over. There is room in the car for one box.
	</p>
	<h2><SplitText text={PROMPT} stagger={40} delay={0} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="layout">
		<div class="pack">
			<p class="pack-label">The box — {usedCells} of {ROWS * COLS} slots</p>
			<div class="grid" bind:this={gridEl}>
				{#each Array(ROWS * COLS) as _, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="cell {cellState(Math.floor(i / COLS), i % COLS)}"
					></div>
				{/each}
				{#each Object.entries(placements) as [id, at] (id)}
					{@const item = byId(id)}
					{@const b = bbox(item)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="placed"
						style="--r: {at.row}; --c: {at.col}; --h: {b.h}; --w: {b.w};"
						title={item.name}
						onpointerdown={(e) => startDrag(e, id)}
					>
						<!-- One bordered tile per occupied cell: once several pieces sit
						     side by side, the outline is the only thing separating one
						     belonging from the next. -->
						{#each item.cells as [cr, cc]}
							<span class="tile" style="--tr: {cr}; --tc: {cc};"></span>
						{/each}
						<span class="art" style="--ar: {iconSpot(item)[0]}; --ac: {iconSpot(item)[1]};"
							>{@html item.svg}</span
						>
					</div>
				{/each}
			</div>
		</div>

		<div class="supply">
			<p class="pack-label">Still in the flat</p>
			<div class="pool">
				{#each pooled as item (item.id)}
					{@const b = bbox(item)}
					<div class="pool-item" data-reader-option={item.name} style="--h: {b.h}; --w: {b.w};">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="pool-sprite"
							title={item.name}
							onpointerdown={(e) => startDrag(e, item.id)}
						>
							{#each item.cells as [r, c]}
								<span class="mini-cell" style="--mr: {r}; --mc: {c};"></span>
							{/each}
							<span class="sprite-art">{@html item.svg}</span>
						</div>
						<span class="caption" data-reader-label>{item.name}</span>
					</div>
				{/each}
				{#if pooled.length === 0}
					<p class="caption empty">The shelf is bare.</p>
				{/if}
			</div>
		</div>
	</div>

	{#if dragging}
		{@const item = byId(dragging.id)}
		{@const b = bbox(item)}
		<div class="ghost" style="--h: {b.h}; --w: {b.w}; left: {dragging.x}px; top: {dragging.y}px;">
			{#each item.cells as [r, c]}
				<span class="ghost-cell" style="--mr: {r}; --mc: {c};"></span>
			{/each}
			<span class="sprite-art">{@html item.svg}</span>
		</div>
	{/if}

	<button class="leave" data-answer-submit onclick={leave} disabled={committed} style="animation-delay: {seq.leave}ms">
		<span class="leave-label">{committed ? 'You tape the box shut.' : 'That\u2019s everything'}</span>
	</button>
</div>

<style>
	.movebox {
		--cell: 2.5rem;
		--gap: 6px;
	}
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1rem;
		animation: rise 0.5s both;
	}
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.movebox > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	/* Column, not row: at eight cells wide the grid takes the full card, so the
	   pile of remaining belongings sits underneath it rather than beside. */
	.layout {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: stretch;
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
	.grid {
		position: relative;
		display: grid;
		grid-template-columns: repeat(8, var(--cell));
		grid-template-rows: repeat(6, var(--cell));
		gap: var(--gap);
		padding: var(--gap);
		border: 1px solid var(--rule);
		background: var(--accent-soft);
		touch-action: none;
		/* The columns are a fixed size, so without this the box stretches to the
		   full card width and draws a border around empty space to the right of
		   the last column — and worse, the drop-target maths in `cellAt()` divides
		   the element's width by COLS, so a stretched box would map pointer
		   positions to the wrong column. */
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
	.tile {
		position: absolute;
		left: calc(var(--tc) * (var(--cell) + var(--gap)));
		top: calc(var(--tr) * (var(--cell) + var(--gap)));
		width: var(--cell);
		height: var(--cell);
		background: var(--surface);
		border: 1px solid var(--ink);
		border-radius: 2px;
	}
	.art {
		position: absolute;
		left: calc(var(--ac) * (var(--cell) + var(--gap)));
		top: calc(var(--ar) * (var(--cell) + var(--gap)));
		width: var(--cell);
		height: var(--cell);
		padding: 0.18rem;
		display: block;
		pointer-events: none;
	}
	.art :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
	.placed {
		position: absolute;
		left: calc(var(--gap) + var(--c) * (var(--cell) + var(--gap)));
		top: calc(var(--gap) + var(--r) * (var(--cell) + var(--gap)));
		width: calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap));
		height: calc(var(--h) * var(--cell) + (var(--h) - 1) * var(--gap));
		color: var(--ink);
		cursor: grab;
		touch-action: none;
	}
	.placed :global(svg) {
		width: 100%;
		height: 100%;
	}
	.supply {
		flex: 1;
		min-width: 0;
	}
	.pool {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem 1.1rem;
		align-items: flex-start;
	}
	.pool-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.pool-sprite {
		--pcell: 2.1rem;
		--pgap: 3px;
		position: relative;
		width: calc(var(--w) * var(--pcell) + (var(--w) - 1) * var(--pgap));
		height: calc(var(--h) * var(--pcell) + (var(--h) - 1) * var(--pgap));
		color: var(--ink);
		cursor: grab;
		touch-action: none;
	}
	/* the item's true footprint, shown as slots behind the sprite */
	.mini-cell {
		position: absolute;
		left: calc(var(--mc) * (var(--pcell) + var(--pgap)));
		top: calc(var(--mr) * (var(--pcell) + var(--pgap)));
		width: var(--pcell);
		height: var(--pcell);
		border: 1px dashed var(--rule);
		background: var(--accent-soft);
	}
	.sprite-art {
		position: absolute;
		inset: 0;
		padding: 0.15rem;
	}
	.sprite-art :global(svg) {
		width: 100%;
		height: 100%;
	}
	.caption {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
	}
	.caption.empty {
		font-style: italic;
		text-transform: none;
		letter-spacing: normal;
	}
	.ghost {
		position: fixed;
		width: calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap));
		height: calc(var(--h) * var(--cell) + (var(--h) - 1) * var(--gap));
		transform: translate(-1.1rem, -1.1rem) rotate(-3deg);
		color: var(--ink);
		pointer-events: none;
		z-index: 10;
		filter: drop-shadow(0 0.4rem 0.35rem rgba(0, 0, 0, 0.18));
	}
	.ghost-cell {
		position: absolute;
		left: calc(var(--mc) * (var(--cell) + var(--gap)));
		top: calc(var(--mr) * (var(--cell) + var(--gap)));
		width: var(--cell);
		height: var(--cell);
		border: 1px dashed var(--rule);
		background: rgba(252, 252, 251, 0.85);
	}
	.leave {
		animation: rise 0.42s both;
		position: relative;
		overflow: hidden;
		padding: 0.8rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		transition: opacity 0.3s ease;
	}
	.leave:disabled {
		cursor: default;
		opacity: 0.8;
	}
	.leave-label {
		position: relative;
	}
	@media (max-width: 640px) {
		.movebox {
			--cell: 3rem;
		}
		.layout {
			flex-direction: column;
			gap: 1.5rem;
		}
	}
</style>
