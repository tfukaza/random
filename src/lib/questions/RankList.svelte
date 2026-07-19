<script>
	// Shared presentational helper for rank-order questions: a vertical list the
	// taker drags into their own order, 1 at the top. Built as a helper rather
	// than baked into one question because more ranking questions are coming.
	//
	// Dragging is handled by SnapSort (@snap-engine/snapsort-svelte) rather than
	// hand-rolled pointer math: `Engine` > `Container` > `Item`, with the drag
	// starting from an explicit `Handle`. SnapSort owns the gesture; this
	// component still owns `order`, and the `onItemMove` callback is the single
	// place the array is rewritten — the arrow buttons route through the same
	// `move()` so pointer and keyboard can't diverge.
	//
	// ANIMATION IS OFF ON PURPOSE. SnapSort ships FLIP + reorder animations by
	// default; `animation: null` and `disableFlip: true` switch both off, because
	// the plain, immediate snap is the intended feel here (same as Q32's balance).
	// Don't reintroduce motion without being asked.
	import { Engine } from '@snap-engine/asset-base-svelte';
	import { Container, Item, Handle } from '@snap-engine/snapsort-svelte';
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';

	// `premise` is optional scene-setting shown above the prompt — used by lore
	// arc questions (see docs/lore.md); plain questions just omit it.
	/** @type {{
	 *   premise?: string,
	 *   prompt: string,
	 *   items: Array<{ id: string, label: string }>,
	 *   topLabel?: string,
	 *   bottomLabel?: string,
	 *   toScore: (ordered: Array<{ id: string, label: string }>) => Record<string, number>,
	 *   onAnswer: (delta: Record<string, number>) => void
	 * }} */
	let {
		premise = '',
		prompt,
		items,
		topLabel = 'Most',
		bottomLabel = 'Least',
		toScore,
		onAnswer
	} = $props();

	// premise → prompt → rule → hint → rows → Next (last, per $lib/reveal.js).
	const seq = $derived.by(() => {
		const c = cascade();
		return {
			premise: premise ? c.text(premise) : 0,
			prompt: c.text(prompt),
			rule: c.rule(),
			hint: c.block(),
			rows: c.items(items.length),
			next: c.action()
		};
	});

	// Presented in the order the question author wrote them; the taker's job is
	// to disagree with that. Each question remounts fresh via #key, so seeding
	// from the prop once is enough.
	// svelte-ignore state_referenced_locally
	let order = $state([...items]);
	let committed = $state(false);

	/** @param {number} from @param {number} to */
	function move(from, to) {
		if (from < 0 || to === from || to < 0 || to >= order.length) return;
		const next = [...order];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		order = next;
	}

	// SnapSort has already moved the DOM node; this brings `order` back in sync so
	// the rank numbers and the committed answer match what's on screen.
	/** @param {{ itemId: string | number, to: { index: number } }} event */
	function onItemMove(event) {
		const id = String(event.itemId);
		move(
			order.findIndex((it) => it.id === id),
			event.to.index
		);
		void playSfx('drop-valid');
	}

	const config = {
		direction: /** @type {const} */ ('column'),
		groupID: 'rank',
		// Both are needed: `animation` covers reorder/drop/click-move, `disableFlip`
		// covers the FLIP movement tween.
		animation: null,
		disableFlip: true,
		callbacks: { onItemMove }
	};

	/** Arrow buttons: the whole mechanic without a pointer, for touch and keyboard.
	 * @param {number} i @param {number} dir */
	function nudge(i, dir) {
		if (committed) return;
		move(i, i + dir);
	}

	function commit() {
		if (committed) return;
		committed = true;
		setTimeout(() => onAnswer(toScore(order)), 450);
	}
</script>

<div class="rank-list">
	{#if premise}
		<p class="premise"><SplitText text={premise} delay={seq.premise} /></p>
	{/if}
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<p class="attribution">
		<a href="https://snapengine.dev/" target="_blank" rel="noreferrer">Powered by Snap Engine</a>
	</p>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />
	<p class="hint" style="animation-delay: {seq.hint}ms">Drag to reorder, or use the arrows.</p>

	<div class="scale-labels">
		<span>{topLabel}</span>
		<span>{bottomLabel}</span>
	</div>

	<div class="list">
		<Engine id="rank-list">
			<Container {config} className="rows" items={order} getItemId={(it) => it.id}>
				{#snippet entry(item)}
					{@const i = order.findIndex((x) => x.id === item.id)}
					<Item itemId={item.id} className="row">
						<span class="rank">{i + 1}</span>
						<Handle className="grip">
							<span class="grip-lines" aria-hidden="true"></span>
							<span class="label">{item.label}</span>
						</Handle>
						<span class="arrows">
							<button
								aria-label="Move {item.label} up"
								disabled={i === 0}
								onclick={() => nudge(i, -1)}>↑</button
							>
							<button
								aria-label="Move {item.label} down"
								disabled={i === order.length - 1}
								onclick={() => nudge(i, 1)}>↓</button
							>
						</span>
					</Item>
				{/snippet}
			</Container>
		</Engine>
	</div>

	<button class="next" onclick={commit} disabled={committed} style="animation-delay: {seq.next}ms"
		>Next →</button
	>
</div>

<style>
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 1rem;
	}
	h2 {
		margin: 0 0 0.4rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.attribution {
		margin: 0 0 1.25rem;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
	}
	.attribution a {
		color: var(--muted);
		text-decoration-color: var(--border);
		text-underline-offset: 0.16em;
	}
	.attribution a:hover {
		color: var(--ink);
		text-decoration-color: currentColor;
	}
	.rank-list > hr {
		margin: 0 0 1rem;
		animation: draw 0.4s both;
	}
	.hint {
		animation: rise 0.42s both;
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 1.5rem;
	}
	.scale-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		margin-bottom: 0.6rem;
	}

	.list {
		margin: 0 0 2rem;
	}
	/* SnapSort's `Engine` renders `#snap-canvas` with `height:100%; overflow:hidden`
	   as an INLINE style, which clips the drag preview at the list's edges. It
	   declares a `style` prop but never applies it, so there's no prop-level
	   override — `!important` is the only lever an inline style answers to. */
	.list :global(#snap-canvas) {
		overflow: visible !important;
		height: auto !important;
	}
	/* SnapSort renders the container and items itself, so these reach into its
	   markup — `:global` is required and the class names are the ones passed via
	   `className` on Container/Item/Handle.

	   IMPORTANT: SnapSort's components ship scoped styles that fight these.
	   `.snapsort-item` is `display:flex; flex-direction:column; align-items:center;
	   justify-content:center; padding:var(--size-4)` — that column is what stacked
	   the rank, label and arrows on top of each other, because a bare `display:flex`
	   here left their `flex-direction` untouched. `.snapsort-container` adds
	   `flex-wrap:wrap; align-items:flex-start`, the latter shrinking rows to their
	   content width instead of filling the list.

	   So: pair each library class with one of ours (`.snapsort-item.row`) to outrank
	   their scoped selectors, and restate every property they set instead of
	   trusting a default. The container's own `flex-direction`/`justify-content`
	   come from an inline style driven by `config.direction`, so those always win
	   regardless — the column rule below just states the intent. */
	.list :global(.snapsort-container.rows) {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		align-items: stretch;
		gap: 0.6rem;
		/* Dragging is press-and-move over text, so without this every drag also
		   selects the label it started on. */
		-webkit-user-select: none;
		user-select: none;
	}
	.list :global(.snapsort-item.row) {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		justify-content: flex-start;
		padding: 0;
		gap: 0.75rem;
	}
	.list :global(.rank) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		flex-shrink: 0;
		font-family: 'Lora', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--muted);
	}
	.list :global(.snapsort-handle.grip) {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem 1.15rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: grab;
		touch-action: none;
	}
	.list :global(.snapsort-handle.grip:hover) {
		border-color: var(--ink);
	}
	/* Three stacked lines — the conventional "you can drag this" affordance. */
	.list :global(.grip-lines) {
		flex-shrink: 0;
		width: 0.9rem;
		height: 0.6rem;
		border-top: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		position: relative;
	}
	.list :global(.grip-lines)::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		border-top: 1px solid var(--rule);
	}
	.list :global(.label) {
		font-size: 1.05rem;
		font-weight: 500;
	}
	.list :global(.arrows) {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.list :global(.arrows button) {
		flex: 1;
		width: 2rem;
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font: inherit;
		font-size: 0.8rem;
		color: var(--muted);
		cursor: pointer;
	}
	.list :global(.arrows button:hover:not(:disabled)) {
		border-color: var(--ink);
		color: var(--ink);
	}
	.list :global(.arrows button:disabled) {
		opacity: 0.35;
		cursor: default;
	}

	.next {
		animation: rise 0.42s both;
		display: block;
		margin-left: auto;
		padding: 0.75rem 1.5rem;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.25s ease;
	}
	.next:hover:not(:disabled) {
		background: #0f0f0f;
	}
	.next:disabled {
		opacity: 0.6;
		cursor: default;
	}

	@media (max-width: 520px) {
		.list :global(.snapsort-handle.grip) {
			padding: 0.85rem 0.9rem;
		}
		.list :global(.label) {
			font-size: 0.95rem;
		}
	}
</style>
