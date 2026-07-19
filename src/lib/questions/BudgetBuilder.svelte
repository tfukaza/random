<script>
	// Shared "video-game character creation" style budget allocator. Each row is
	// a category with -/+ steppers that move the allocation in fixed increments;
	// the rightmost cell describes what you actually get at the current tier.
	// Rows share one budget, so + is blocked once the budget is spent.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';

	let { prompt, budget, step = 10, categories, toScore, onAnswer } = $props();

	// prompt → rule → category rows → submit (last, once the rows have landed).
	const seq = $derived.by(() => {
		const c = cascade();
		return {
			prompt: c.text(prompt),
			rule: c.rule(),
			rows: c.items(categories.length),
			submit: c.action()
		};
	});

	// svelte-ignore state_referenced_locally
	let values = $state(
		Object.fromEntries(categories.map(/** @param {{ id: string }} c */ (c) => [c.id, 0]))
	);

	const total = $derived(Object.values(values).reduce((a, b) => a + b, 0));
	const remaining = $derived(budget - total);

	/** @param {{ tiers: Record<number, string> }} cat */
	const maxOf = (cat) => Math.max(...Object.keys(cat.tiers).map(Number));

	/** @param {{ id: string, tiers: Record<number, string> }} cat */
	function inc(cat) {
		if (values[cat.id] + step <= maxOf(cat) && remaining >= step) {
			values = { ...values, [cat.id]: values[cat.id] + step };
		}
	}

	/** @param {{ id: string }} cat */
	function dec(cat) {
		if (values[cat.id] - step >= 0) {
			values = { ...values, [cat.id]: values[cat.id] - step };
		}
	}

	function submit() {
		onAnswer(toScore(values));
	}
</script>

<div class="builder">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<p class="remaining" class:tight={remaining === 0} style="animation-delay: {seq.rows}ms">
		<span class="amt">${remaining}</span> of ${budget} left to spend
	</p>

	<div class="rows">
		{#each categories as cat}
			<div class="row">
				<span class="name">{cat.label}</span>
				<div class="stepper">
					<button
						class="step"
						disabled={values[cat.id] === 0}
						onclick={() => dec(cat)}
						aria-label={`Less ${cat.label}`}>−</button
					>
					<span class="cost">${values[cat.id]}</span>
					<button
						class="step"
						disabled={values[cat.id] >= maxOf(cat) || remaining < step}
						onclick={() => inc(cat)}
						aria-label={`More ${cat.label}`}>+</button
					>
				</div>
				<span class="desc">{cat.tiers[values[cat.id]]}</span>
			</div>
		{/each}
	</div>

	<button class="submit" onclick={submit} style="animation-delay: {seq.submit}ms"
		>Lock in my dinner →</button
	>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.builder > hr {
		animation: draw 0.4s both;
		margin: 0 0 1.25rem;
	}
	.remaining {
		text-align: center;
		font-weight: 600;
		color: var(--muted);
		margin: 0 0 2rem;
	}
	.remaining .amt {
		color: var(--ink);
	}
	.remaining.tight .amt {
		color: var(--muted);
	}
	.remaining {
		animation: rise 0.42s both;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2.5rem;
	}
	.row {
		display: grid;
		grid-template-columns: 6.5rem auto 1fr;
		align-items: center;
		gap: 1rem;
		padding: 0.9rem 1.1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.name {
		font-weight: 600;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.step {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
		line-height: 1;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		cursor: pointer;
		color: inherit;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.step:hover:not(:disabled) {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.step:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.cost {
		min-width: 3rem;
		text-align: center;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.desc {
		color: var(--muted);
		font-style: italic;
	}
	.submit {
		animation: rise 0.42s both;
		display: block;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
		background: var(--ink);
		color: var(--surface);
		border: none;
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: filter 0.12s ease;
	}
	.submit:hover {
		filter: brightness(1.08);
	}
	@media (max-width: 560px) {
		.row {
			grid-template-columns: 1fr auto;
			row-gap: 0.5rem;
		}
		.desc {
			grid-column: 1 / -1;
		}
	}
</style>
