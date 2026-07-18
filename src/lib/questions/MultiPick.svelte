<script>
	// Shared presentational helper for multi-select questions: toggle any number
	// of chips (including zero), then hit submit to commit. Score deltas from
	// every selected option are summed before being handed to onAnswer.
	import SplitText from '$lib/SplitText.svelte';

	let { prompt, options, onAnswer } = $props();

	let selected = $state(new Set());

	/** @param {number} i */
	function toggle(i) {
		const next = new Set(selected);
		next.has(i) ? next.delete(i) : next.add(i);
		selected = next;
	}

	function submit() {
		/** @type {Record<string, number>} */
		const delta = {};
		for (const i of selected) {
			for (const [id, points] of Object.entries(options[i].score ?? {})) {
				delta[id] = (delta[id] ?? 0) + points;
			}
		}
		onAnswer(delta); // empty delta is fine — "none of these" is a valid answer
	}
</script>

<div class="multi-pick">
	<h2><SplitText text={prompt} stagger={14} /></h2>
	<hr class="rule" />
	<div class="chips">
		{#each options as opt, i}
			<button class="chip" class:on={selected.has(i)} style="--i: {i}" onclick={() => toggle(i)}>
				<span class="box">{selected.has(i) ? '✓' : ''}</span>
				<span class="label">{opt.label}</span>
			</button>
		{/each}
	</div>

	<button class="submit" onclick={submit}>
		{selected.size ? `Submit (${selected.size} selected) →` : 'Submit — none of these →'}
	</button>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.multi-pick > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}
	.chips {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem 1.25rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		color: inherit;
		animation: rise 0.45s calc(0.25s + var(--i) * 80ms) both;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}
	.chip:hover {
		border-color: var(--ink);
	}
	.chip.on {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.35rem;
		height: 1.35rem;
		flex-shrink: 0;
		border: 1px solid var(--rule);
		border-radius: 0;
		font-weight: 700;
		color: var(--ink);
	}
	.chip.on .box {
		border-color: var(--ink);
	}
	.label {
		font-size: 1.05rem;
		font-weight: 500;
	}
	.submit {
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
	.submit:hover {
		background: #0f0f0f;
	}
</style>
