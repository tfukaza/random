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
	import { currentAttempt, recordDraft, recordEvent } from '$lib/questions/metrics.svelte.js';

	const PROMPT = 'One box is going with you. What do you take?';

	let { onAnswer } = $props();

	// Fresh session: forget any earlier run's first-packed item before this one
	// records its own. Runs once on mount (the orchestrator remounts per question).
	box.firstPacked = null;

	// prompt → rule → grid → "grab it and go" (last, per $lib/reveal.js).
	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), layout: c.block(), leave: c.action() };
	})();

	// 6 × 8 = 48 slots against the sixteen pieces' 49 blocks. Everything does NOT
	// fit, on purpose — see the header of boxItems.js before touching either
	// number, because the one-block overrun IS the question and a perfect 48/48
	// fill must stay reachable by leaving a one-cell item behind.
	const ROWS = 6;
	const COLS = 8;

	// Thresholds for the detail test in `leave()`. Sixteen items need sixteen
	// pick-ups to place at all, so the budget is doubled: it takes real thrashing
	// to pass it, not ordinary tidying up.
	const MOVE_BUDGET = 32;
	const IMPOSSIBILITY_GRACE_MS = 60_000;

	/** @type {Record<string, {row: number, col: number}>} */
	let placements = $state({});
	/** @type {{id: string, x: number, y: number} | null} */
	let dragging = $state(null);
	/** @type {{row: number, col: number, valid: boolean} | null} */
	let preview = $state(null);
	// The grid's cell/gap in px, captured when a drag begins. The ghost is drawn
	// outside .grid and so cannot inherit --cell; without this it collapses to
	// nothing and the drag becomes invisible.
	/** @type {{cell: number, gap: number}} */
	let ghostScale = $state({ cell: 40, gap: 6 });
	let committed = $state(false);
	// Every pick-up: out of the tray, back out of the box, or shifted one square.
	// Read at submit time against the clock — see the note above `leave()`.
	let moves = $state(0);

	/** @type {HTMLElement} */
	let gridEl;

	/** @param {string} id */
	const byId = (id) => /** @type {typeof ITEMS[number]} */ (ITEMS.find((it) => it.id === id));
	/** @param {typeof ITEMS[number]} item */
	const bbox = (item) => ({
		h: Math.max(...item.cells.map(([r]) => r)) + 1,
		w: Math.max(...item.cells.map(([, c]) => c)) + 1
	});

	// Per-cell edge flags: which sides of this cell face another cell of the SAME
	// piece. Everything that draws a footprint — the placed piece, the drag ghost,
	// the tray sprite — uses these to grow each cell over the internal gutter and
	// drop the border on shared edges, so a polyomino reads as one silhouette with
	// one outline instead of N separate boxes. The gap between DIFFERENT pieces is
	// untouched, and it is the only thing telling one belonging from the next.
	/** @param {{cells: number[][]}} item */
	function tiles(item) {
		const has = new Set(item.cells.map(([r, c]) => `${r},${c}`));
		return item.cells.map(([r, c]) => ({
			r,
			c,
			top: has.has(`${r - 1},${c}`),
			right: has.has(`${r},${c + 1}`),
			bottom: has.has(`${r + 1},${c}`),
			left: has.has(`${r},${c - 1}`)
		}));
	}

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

	// The grid's real geometry in px, measured off the live element. `--cell` is a
	// container-query expression that only resolves INSIDE .grid, so anything
	// drawn outside it — the drag ghost — has to be told the number rather than
	// inheriting the variable. Reading it here also keeps the hit-test and the
	// ghost provably in agreement: one measurement, two consumers.
	function gridMetrics() {
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const cs = getComputedStyle(gridEl);
		const px = (/** @type {string} */ value) => parseFloat(value) || 0;
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

	// Maps a pointer position to a grid square. This walks the real stride —
	// border, then padding, then cell-plus-gap per column — rather than dividing
	// the element's total width by COLS. That shortcut folds the padding and the
	// seven gutters into the cell size, which is a tolerable error at a 40px cell
	// and a real one at the ~30px cell a phone gets: the last column becomes hard
	// to hit on exactly the devices that can least afford it.
	/** @param {number} x @param {number} y */
	function cellFromPoint(x, y) {
		const m = gridMetrics();
		if (!m) return null;
		const { rect } = m;
		if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
		return {
			row: Math.max(0, Math.min(ROWS - 1, Math.floor((y - m.originY) / (m.cellH + m.gapY)))),
			col: Math.max(0, Math.min(COLS - 1, Math.floor((x - m.originX) / (m.cellW + m.gapX))))
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
		moves += 1;
		if (id in placements) {
			// Already in the box — taking it back out (or repositioning it) is a
			// change of mind. Dragging from the pile is not.
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
			// The first piece to land is remembered for balance-scale (see boxState).
			if (box.firstPacked === null) box.firstPacked = dragging.id;
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
		// a right answer. The catalogue totals 49 blocks against 48 slots, so
		// bringing everything is impossible; a full grid means the taker worked
		// out what to abandon and then packed the rest without a wasted square.
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

		// THE DETAIL TEST. Every item's block count is printed beside its name and
		// the box states its 48 slots, so the 49-vs-48 overrun is available to
		// anyone who adds up. Someone who never does keeps hunting for a packing
		// that cannot exist — a long session with a lot of shuffling is the
		// signature of exactly that, so it costs detail-orientation (scope runs
		// negative = detail-oriented, positive = big-picture).
		//
		// Both conditions are required, and deliberately so. Many moves in a short
		// burst is someone playing quickly, not someone missing the point; a long
		// sit with few moves is someone thinking, which is the opposite of the
		// failure being measured. Only the two together mean sustained effort
		// spent on an impossibility.
		const dwellMs = performance.now() - (currentAttempt()?.startedAt ?? performance.now());
		const laboured = moves > MOVE_BUDGET && dwellMs > IMPOSSIBILITY_GRACE_MS;
		if (laboured) add('scope', 3);
		recordEvent('pack-effort', { moves, dwellMs: Math.round(dwellMs), filled, laboured });

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
			<div class="grid" bind:this={gridEl} style="--rows: {ROWS}; --cols: {COLS};">
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
						<!-- One tile per occupied cell, but joined into a single silhouette:
						     each grows over the gutter toward its same-piece neighbours and
						     drops the border on that side. Once several pieces sit side by
						     side, that outline is the only thing separating one belonging
						     from the next. -->
						{#each tiles(item) as t}
							<span
								class="tile"
								class:no-t={t.top}
								class:no-r={t.right}
								class:no-b={t.bottom}
								class:no-l={t.left}
								style="--tr: {t.r}; --tc: {t.c}; --joinx: {t.right ? 1 : 0}; --joiny: {t.bottom
									? 1
									: 0};"
							></span>
						{/each}
						<span class="art">
							<img src={item.sprite} alt="" draggable="false" />
						</span>
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
							{#each tiles(item) as t}
								<span
									class="mini-cell"
									class:no-t={t.top}
									class:no-r={t.right}
									class:no-b={t.bottom}
									class:no-l={t.left}
									style="--mr: {t.r}; --mc: {t.c}; --joinx: {t.right ? 1 : 0}; --joiny: {t.bottom
										? 1
										: 0};"
								></span>
							{/each}
							<span class="sprite-art">
								<img src={item.sprite} alt="" draggable="false" />
							</span>
						</div>
						<!-- The block count is the tell. Sixteen items come to 49 against 48
						     slots, so the arithmetic needed to realise the box cannot hold
						     everything is on screen from the first second — stated plainly,
						     never pointed at. -->
						<span class="caption" data-reader-label
							>{item.name} ({item.cells.length})</span
						>
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
		<!-- --cell/--gap are set in px here, not inherited: this element sits
		     outside .grid, where the container-query expression for --cell does
		     not resolve. -->
		<div
			class="ghost"
			style="--cell: {ghostScale.cell}px; --gap: {ghostScale.gap}px; --h: {b.h}; --w: {b.w}; left: {dragging.x}px; top: {dragging.y}px;"
		>
			{#each tiles(item) as t}
				<span
					class="ghost-cell"
					class:no-t={t.top}
					class:no-r={t.right}
					class:no-b={t.bottom}
					class:no-l={t.left}
					style="--mr: {t.r}; --mc: {t.c}; --joinx: {t.right ? 1 : 0}; --joiny: {t.bottom ? 1 : 0};"
				></span>
			{/each}
			<span class="sprite-art">
				<img src={item.sprite} alt="" draggable="false" />
			</span>
		</div>
	{/if}

	<button class="leave" data-answer-submit onclick={leave} disabled={committed} style="animation-delay: {seq.leave}ms">
		<span class="leave-label">{committed ? 'You tape the box shut.' : 'That\u2019s everything'}</span>
	</button>
</div>

<style>
	.movebox {
		--gap: clamp(4px, 1.2cqw, 6px);
		/* Fallback only. The real --cell is a container-query expression on .grid
		   and does not resolve outside it, so anything drawn elsewhere degrades to
		   the desktop size rather than collapsing to a zero-sized calc(). The drag
		   ghost overrides this with measured px; this is the guard for the next
		   thing that forgets. */
		--cell: 2.5rem;
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
	/* The grid sizes itself against THIS box, which is the card's real interior
	   width. `vw` cannot do that job: the frame's padding is itself a clamp() and
	   changes with the viewport, so a vw-derived cell either overflows on small
	   phones or wastes space on large ones. */
	.pack {
		container-type: inline-size;
		-webkit-user-select: none;
		user-select: none;
	}
	.grid {
		position: relative;
		display: grid;
		/* Eight columns must always fit the card, and must never grow past the
		   desktop size. One min() covers both, continuously, with no breakpoint —
		   the +1 gap accounts for the padding on each side, the 2px for the
		   border. */
		--cell: min(2.5rem, calc((100cqw - (var(--cols) + 1) * var(--gap) - 2px) / var(--cols)));
		grid-template-columns: repeat(var(--cols), var(--cell));
		grid-template-rows: repeat(var(--rows), var(--cell));
		gap: var(--gap);
		padding: var(--gap);
		border: 1px solid var(--rule);
		background: var(--accent-soft);
		touch-action: none;
		/* The columns are a fixed size, so without this the box stretches to the
		   full card width and draws a border around empty space to the right of
		   the last column — and worse, the drop-target maths in `cellFromPoint()`
		   would then map pointer positions to the wrong column. */
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
	/* `--joinx`/`--joiny` extend a cell over the gutter toward a same-piece
	   neighbour. Because `box-sizing: border-box` is global, the extended edge
	   lands exactly where the neighbour's own edge starts, so the fills meet with
	   no seam and the surviving borders form one continuous outline. No
	   border-radius: rounded corners would notch every join. */
	.tile {
		position: absolute;
		left: calc(var(--tc) * (var(--cell) + var(--gap)));
		top: calc(var(--tr) * (var(--cell) + var(--gap)));
		width: calc(var(--cell) + var(--joinx) * var(--gap));
		height: calc(var(--cell) + var(--joiny) * var(--gap));
		background: var(--surface);
		border: 1px solid var(--ink);
	}
	/* Shared edges are interior to the shape, so they carry no outline. */
	.tile.no-t,
	.mini-cell.no-t,
	.ghost-cell.no-t {
		border-top-width: 0;
	}
	.tile.no-r,
	.mini-cell.no-r,
	.ghost-cell.no-r {
		border-right-width: 0;
	}
	.tile.no-b,
	.mini-cell.no-b,
	.ghost-cell.no-b {
		border-bottom-width: 0;
	}
	.tile.no-l,
	.mini-cell.no-l,
	.ghost-cell.no-l {
		border-left-width: 0;
	}
	.art {
		position: absolute;
		inset: 0;
		padding: 1px;
		display: block;
		pointer-events: none;
		z-index: 1;
	}
	.art img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: fill;
		-webkit-user-select: none;
		user-select: none;
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
	.supply {
		flex: 1;
		min-width: 0;
		-webkit-user-select: none;
		user-select: none;
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
		width: calc(var(--pcell) + var(--joinx) * var(--pgap));
		height: calc(var(--pcell) + var(--joiny) * var(--pgap));
		border: 1px dashed var(--rule);
		background: var(--accent-soft);
	}
	.sprite-art {
		position: absolute;
		inset: 0;
		padding: 1px;
		pointer-events: none;
	}
	.sprite-art img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: fill;
		-webkit-user-select: none;
		user-select: none;
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
		width: calc(var(--cell) + var(--joinx) * var(--gap));
		height: calc(var(--cell) + var(--joiny) * var(--gap));
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
</style>
