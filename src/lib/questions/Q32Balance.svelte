<script>
	// Q32 — a balance scale you load yourself. Drag items onto either pan until
	// the two sides are, in your opinion, worth the same.
	//
	// THE JOKE IS THE BEAM: it never tilts. Not once, whatever you put where. A
	// balance scale is an instrument for measuring a quantity that is not up for
	// debate, and this one simply agrees with you — a car against a Mac mini,
	// everything against a fact about D. B. Cooper, all perfectly level. On each
	// drop it wobbles as if it might finally object, then settles back to dead
	// horizontal. The wobble is the whole performance; see `.beam.settling`.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	let { onAnswer } = $props();

	const seq = (() => {
		const c = cascade();
		c.text('What would you consider to be equal in value?');
		return { rule: c.rule(), rig: c.block(), next: c.action() };
	})();

	const ITEMS = [
		{ id: 'car', label: 'A car' },
		{ id: 'fridge', label: 'A refrigerator' },
		{ id: 'ozempic', label: 'Ozempic' },
		{ id: 'macmini', label: 'A Mac mini' },
		{ id: 'oil', label: 'A barrel of oil' },
		{ id: 'pokemon', label: 'A deck of rare Pokémon cards' },
		{ id: 'cooper', label: 'Knowledge of the whereabouts of D. B. Cooper' }
	];

	/** @type {Record<string, 'left' | 'right'>} */
	let sides = $state({});
	/** @type {{ id: string, x: number, y: number, moved: boolean } | null} */
	let dragging = $state(null);
	/** @type {'left' | 'right' | 'tray' | null} */
	let hovering = $state(null);
	let settling = $state(false);
	/** Which way the beam dips before recovering: -1 left, +1 right. */
	let settleDir = $state(1);
	let committed = $state(false);

	/** @type {HTMLElement} */
	let leftEl;
	/** @type {HTMLElement} */
	let rightEl;
	/** @type {HTMLElement} */
	let trayEl;

	/** @param {string} id */
	const byId = (id) => /** @type {typeof ITEMS[number]} */ (ITEMS.find((it) => it.id === id));

	// The dragged item is pulled out of its home so the layout doesn't jump while
	// it's in the air — same trick as pack-box's pool.
	const inTray = $derived(ITEMS.filter((it) => !(it.id in sides) && dragging?.id !== it.id));
	const onLeft = $derived(ITEMS.filter((it) => sides[it.id] === 'left' && dragging?.id !== it.id));
	const onRight = $derived(ITEMS.filter((it) => sides[it.id] === 'right' && dragging?.id !== it.id));
	const loaded = $derived(onLeft.length > 0 && onRight.length > 0);

	/** @param {number} x @param {number} y */
	function zoneFromPoint(x, y) {
		/** @type {Array<['left' | 'right' | 'tray', HTMLElement]>} */
		const zones = [
			['left', leftEl],
			['right', rightEl],
			['tray', trayEl]
		];
		for (const [name, el] of zones) {
			if (!el) continue;
			const r = el.getBoundingClientRect();
			if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return name;
		}
		return null;
	}

	/** @param {string} id @param {'left' | 'right' | 'tray'} zone */
	function place(id, zone) {
		// Captured before the mutation below — the tray case needs to know which
		// pan the item is leaving.
		const from = sides[id];
		// It was already on a pan, so this is a reweighing, not a first placement.
		if (zone === 'tray') {
			const { [id]: _, ...rest } = sides;
			sides = rest;
		} else {
			sides = { ...sides, [id]: zone };
		}
		recordDraft({ format: 'configuration', value: sides });
		// Dip toward whichever pan just took weight, then recover to level. Coming
		// off the scale dips the *other* way, as unloading a real pan would.
		if (zone === 'left') settleDir = -1;
		else if (zone === 'right') settleDir = 1;
		else settleDir = from === 'left' ? 1 : -1;
		// Restart the animation: drop the class, let a frame pass, re-add it.
		settling = false;
		requestAnimationFrame(() => (settling = true));
		void playSfx('balance-settle');
	}

	/** A plain click with no drag cycles the item along — keyboard/touch friendly.
	 * @param {string} id */
	function cycle(id) {
		const at = sides[id];
		place(id, at === undefined ? 'left' : at === 'left' ? 'right' : 'tray');
	}

	/** @param {PointerEvent} e @param {string} id */
	function startDrag(e, id) {
		if (committed) return;
		e.preventDefault();
		dragging = { id, x: e.clientX, y: e.clientY, moved: false };
		void playSfx('drag-pickup');
		hovering = zoneFromPoint(e.clientX, e.clientY);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}

	/** @param {PointerEvent} e */
	function onMove(e) {
		if (!dragging) return;
		const moved =
			dragging.moved || Math.abs(e.clientX - dragging.x) + Math.abs(e.clientY - dragging.y) > 4;
		dragging = { ...dragging, x: e.clientX, y: e.clientY, moved };
		hovering = zoneFromPoint(e.clientX, e.clientY);
	}

	function onUp() {
		if (dragging) {
			// A tap that never moved is a click, not a failed drag — cycle instead
			// of silently doing nothing.
			if (!dragging.moved) cycle(dragging.id);
			else if (hovering) place(dragging.id, hovering);
			else void playSfx('drop-invalid');
		}
		dragging = null;
		hovering = null;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);
	}

	function commit() {
		if (committed || !loaded) return;
		committed = true;
		recordDraft({ format: 'configuration', value: sides });
		// Placeholder scoring, consistent with every other question — real
		// categories are deferred project-wide.
		const placed = onLeft.length + onRight.length;
		const lopsided = Math.abs(onLeft.length - onRight.length) >= 2;
		/** @type {Record<string, number>} */
		// Declaring a 5-vs-1 pile "equal" is a bold act of big-picture math;
		// carefully balanced counts are bookkeeping. Involving D. B. Cooper at
		// all is its own whimsical signature.
		const delta = lopsided ? { risk: 2, scope: 1 } : { scope: -2 };
		if (placed >= 6) {
			delta.scope = (delta.scope ?? 0) - 1;
		}
		if (sides['cooper']) {
			delta.creative = 2;
			delta.risk = (delta.risk ?? 0) + 1;
		}
		setTimeout(() => onAnswer(delta), 900);
	}
</script>

<div class="balance">
	<h2>
		<SplitText text="What would you consider to be equal in value?" />
	</h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	<p class="hint">
		Load both pans until the two sides are worth the same. Drag, or tap to move an item along.
	</p>

	<div class="rig">
		<!-- Always horizontal. The only motion it ever makes is the settle. -->
		<div class="beam" class:settling style="--dir: {settleDir}"></div>
		<div class="hangers">
			<div class="side" class:settling style="--dir: {settleDir}; --s: -1">
				<span class="rope"></span>
				<div
					class="pan"
					class:hot={hovering === 'left'}
					bind:this={leftEl}
					aria-label="Left pan"
				>
					{#each onLeft as item (item.id)}
						<button class="chip" data-sfx="none" data-reader-option={item.label} onpointerdown={(e) => startDrag(e, item.id)}><span data-reader-label>{item.label}</span></button>
					{/each}
					{#if onLeft.length === 0}<span class="empty">empty</span>{/if}
				</div>
			</div>

			<div class="stand" aria-hidden="true">
				<span class="wedge"></span>
				<span class="column"></span>
				<span class="foot"></span>
			</div>

			<div class="side" class:settling style="--dir: {settleDir}; --s: 1">
				<span class="rope"></span>
				<div
					class="pan"
					class:hot={hovering === 'right'}
					bind:this={rightEl}
					aria-label="Right pan"
				>
					{#each onRight as item (item.id)}
						<button class="chip" data-sfx="none" data-reader-option={item.label} onpointerdown={(e) => startDrag(e, item.id)}><span data-reader-label>{item.label}</span></button>
					{/each}
					{#if onRight.length === 0}<span class="empty">empty</span>{/if}
				</div>
			</div>
		</div>
	</div>

	<p class="verdict" class:on={loaded}>Balanced.</p>

	<div class="tray" class:hot={hovering === 'tray'} bind:this={trayEl}>
		<p class="tray-label">On the table</p>
		<div class="tray-items">
			{#each inTray as item (item.id)}
				<button class="chip" data-sfx="none" data-reader-option={item.label} onpointerdown={(e) => startDrag(e, item.id)}><span data-reader-label>{item.label}</span></button>
			{/each}
			{#if inTray.length === 0}<span class="empty">Everything is on the scale.</span>{/if}
		</div>
	</div>

	{#if dragging}
		<div class="ghost" style="left: {dragging.x}px; top: {dragging.y}px;">
			{byId(dragging.id).label}
		</div>
	{/if}

	<SubmitAnswer
		disabled={!loaded}
		{committed}
		label="These are equal →"
		committedLabel="Noted, and never questioned."
		delay={seq.next}
		onsubmit={commit}
	/>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.balance > hr {
		margin: 0 0 1rem;
		animation: draw 0.5s 0.15s both;
	}
	.hint {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 2rem;
	}

	.rig {
		animation: rise 0.42s both;
	}
	.beam {
		height: 7px;
		border-radius: 4px;
		background: var(--ink);
		transform-origin: 50% 50%;
	}
	/* The performance: it dips toward the pan that just took weight, rocks a
	   couple of times, and resolves to dead level — every single time, whatever
	   you loaded. `--dir` carries which way it dips. */
	.beam.settling {
		animation: settle 1.15s cubic-bezier(0.33, 1, 0.68, 1);
	}
	@keyframes settle {
		0% {
			transform: rotate(0deg);
		}
		18% {
			transform: rotate(calc(var(--dir) * 3deg));
		}
		45% {
			transform: rotate(calc(var(--dir) * -1.6deg));
		}
		70% {
			transform: rotate(calc(var(--dir) * 0.7deg));
		}
		88% {
			transform: rotate(calc(var(--dir) * -0.25deg));
		}
		100% {
			transform: rotate(0deg);
		}
	}

	.hangers {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	/* The pans ride the beam: same timing curve, opposite ends. `--s` is the
	   side's own sign (-1 left, +1 right), `--dir` the direction of the dip, so
	   the product decides whether this pan drops or lifts. */
	.side.settling {
		animation: ride 1.15s cubic-bezier(0.33, 1, 0.68, 1);
	}
	@keyframes ride {
		0% {
			transform: translateY(0);
		}
		18% {
			transform: translateY(calc(var(--dir) * var(--s) * 7px));
		}
		45% {
			transform: translateY(calc(var(--dir) * var(--s) * -3.7px));
		}
		70% {
			transform: translateY(calc(var(--dir) * var(--s) * 1.6px));
		}
		88% {
			transform: translateY(calc(var(--dir) * var(--s) * -0.6px));
		}
		100% {
			transform: translateY(0);
		}
	}
	.rope {
		width: 1px;
		height: 2.25rem;
		background: var(--rule);
	}
	.pan {
		width: 100%;
		min-height: 7rem;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		/* Open-topped, like a real pan: sides and a floor, no lid. */
		border: 1px solid var(--rule);
		border-top: none;
		border-radius: 0 0 0.75rem 0.75rem;
		background: var(--accent-soft);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
		touch-action: none;
	}
	.pan.hot {
		border-color: var(--ink);
		background: var(--surface);
	}

	.stand {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 1.25rem;
	}
	.wedge {
		width: 0;
		height: 0;
		border-left: 0.7rem solid transparent;
		border-right: 0.7rem solid transparent;
		border-bottom: 1.1rem solid var(--ink);
	}
	.column {
		width: 3px;
		height: 4.5rem;
		background: var(--ink);
	}
	.foot {
		width: 5rem;
		height: 5px;
		border-radius: 3px;
		background: var(--ink);
	}

	.verdict {
		text-align: center;
		margin: 1.25rem 0 2rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
		opacity: 0;
		transition: opacity 0.5s ease;
	}
	.verdict.on {
		opacity: 1;
	}

	.tray {
		padding: 1rem;
		border: 1px dashed var(--rule);
		border-radius: var(--radius);
		margin-bottom: 2rem;
		transition: border-color 0.15s ease;
		touch-action: none;
	}
	.tray.hot {
		border-color: var(--ink);
		border-style: solid;
	}
	.tray-label {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.68rem;
		color: var(--muted);
		margin: 0 0 0.75rem;
	}
	.tray-items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.chip {
		padding: 0.55rem 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font: inherit;
		font-size: 0.9rem;
		color: inherit;
		text-align: left;
		cursor: grab;
		touch-action: none;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease;
	}
	.chip:hover {
		border-color: var(--ink);
		transform: translateY(-1px);
	}
	.empty {
		font-size: 0.75rem;
		font-style: italic;
		color: var(--muted);
		align-self: center;
	}

	.ghost {
		position: fixed;
		z-index: 10;
		padding: 0.55rem 0.9rem;
		max-width: 14rem;
		background: var(--surface);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		font-size: 0.9rem;
		transform: translate(-50%, -50%) rotate(-2deg);
		pointer-events: none;
		filter: drop-shadow(0 0.4rem 0.35rem rgba(0, 0, 0, 0.18));
	}

	@media (max-width: 560px) {
		.stand {
			padding: 0 0.5rem;
		}
		.chip {
			font-size: 0.82rem;
		}
	}
</style>
