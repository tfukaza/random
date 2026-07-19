<script>
	// Q26 — inventory-Tetris backpack. A 3×4 grid; items are Tetris-ish shapes
	// (1×1 up to 2×2 and an L) dragged from the supply pile into the pack.
	// There's more supply than pack — what you choose to carry is the answer,
	// and the packed list carries over to Q27 via the shared pack state.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { ITEMS } from './backpackItems.js';
	import { pack } from './backpackState.svelte.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';

	const PROMPT =
		'You found a safe house with supplies, but you must move — now. Your backpack only fits so much. What do you take?';

	let { onAnswer } = $props();

	// prompt → rule → grid → "grab it and go" (last, per $lib/reveal.js).
	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), layout: c.block(), leave: c.action() };
	})();

	const ROWS = 3;
	const COLS = 4;

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
		const cell = dragging && cellFromPoint(x, y);
		preview = cell ? { ...cell, valid: canPlace(dragging.id, cell.row, cell.col) } : null;
	}

	/** @param {PointerEvent} e @param {string} id */
	function startDrag(e, id) {
		if (committed) return;
		e.preventDefault();
		if (id in placements) {
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
		}
		if (dragging) void playSfx(valid ? 'drop-valid' : 'drop-invalid');
		dragging = null;
		preview = null;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
	}

	/** @param {number} row @param {number} col */
	function cellState(row, col) {
		if (!dragging || !preview) return '';
		const covers = byId(dragging.id).cells.some(
			([r, c]) => preview.row + r === row && preview.col + c === col
		);
		return covers ? (preview.valid ? 'ok' : 'bad') : '';
	}

	function leave() {
		if (committed) return;
		committed = true;
		pack.items = Object.keys(placements);
		/** @type {Record<string, number>} */
		const total = {};
		for (const id of Object.keys(placements)) {
			for (const [k, v] of Object.entries(byId(id).score)) total[k] = (total[k] ?? 0) + v;
		}
		setTimeout(() => onAnswer(total), 1100);
	}
</script>

<div class="backpack">
	<p class="premise">
		The zombie apocalypse came and went. Most people didn't make it — you're one of the few
		survivors, roaming a desolate world, looking for the others.
	</p>
	<h2><SplitText text={PROMPT} stagger={40} delay={0} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="layout">
		<div class="pack">
			<p class="pack-label">Backpack — {usedCells} of {ROWS * COLS} slots</p>
			<div class="grid" bind:this={gridEl}>
				{#each Array(ROWS * COLS) as _, i}
					<div
						class="cell {cellState(Math.floor(i / COLS), i % COLS)}"
					></div>
				{/each}
				{#each Object.entries(placements) as [id, at] (id)}
					{@const item = byId(id)}
					{@const b = bbox(item)}
					<div
						class="placed"
						style="--r: {at.row}; --c: {at.col}; --h: {b.h}; --w: {b.w};"
						title={item.name}
						onpointerdown={(e) => startDrag(e, id)}
					>
						{@html item.svg}
					</div>
				{/each}
			</div>
		</div>

		<div class="supply">
			<p class="pack-label">On the shelf</p>
			<div class="pool">
				{#each pooled as item (item.id)}
					{@const b = bbox(item)}
					<div class="pool-item" style="--h: {b.h}; --w: {b.w};">
						<div class="pool-sprite" title={item.name} onpointerdown={(e) => startDrag(e, item.id)}>
							{#each item.cells as [r, c]}
								<span class="mini-cell" style="--mr: {r}; --mc: {c};"></span>
							{/each}
							<span class="sprite-art">{@html item.svg}</span>
						</div>
						<span class="caption">{item.name}</span>
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

	<button class="leave" onclick={leave} disabled={committed} style="animation-delay: {seq.leave}ms">
		<span class="leave-label">{committed ? 'You sling the pack and run.' : 'Grab it and go'}</span>
	</button>
</div>

<style>
	.backpack {
		--cell: 3.4rem;
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
	.backpack > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	.layout {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
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
		grid-template-columns: repeat(4, var(--cell));
		grid-template-rows: repeat(3, var(--cell));
		gap: var(--gap);
		padding: var(--gap);
		border: 1px solid var(--rule);
		background: var(--accent-soft);
		touch-action: none;
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
		width: calc(var(--w) * var(--cell) + (var(--w) - 1) * var(--gap));
		height: calc(var(--h) * var(--cell) + (var(--h) - 1) * var(--gap));
		padding: 0.3rem;
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
		.backpack {
			--cell: 3rem;
		}
		.layout {
			flex-direction: column;
			gap: 1.5rem;
		}
	}
</style>
