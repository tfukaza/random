<script>
	// wallpaper-taste — closes the design block. Each option button IS a live
	// preview of its style: plain, subtle dot grid, emojis flying around,
	// gradient. Recorded into the shared choices store, which artistic-claim
	// reads immediately after. The "your quiz" framing is set up by font-taste.
	import SplitText from '$lib/SplitText.svelte';
	import { choices } from '$lib/design/choices.svelte.js';
	import EmojiFloat from './EmojiFloat.svelte';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	let { onAnswer } = $props();

	const prompt = 'And the background behind it all?';

	const options = [
		{ id: 'plain', label: 'Plain background', score: { creative: -2 } },
		{ id: 'dots', label: 'Subtle pattern', score: { scope: -1 } },
		{ id: 'crazy', label: 'Go crazy', score: { risk: 2, creative: 1 } },
		{ id: 'gradient', label: 'Gradient', score: { creative: 1 } }
	];

	// The flying emojis for the "Go crazy" preview. Each gets its own lane,
	// speed, and delay via CSS custom props.
	const EMOJIS = ['🎉', '🦄', '🍕', '✨', '🐸', '🚀', '💫', '🌈'];

	/** @type {number | null} */
	let picked = $state(null);
	let committed = $state(false);

	/** @param {number} i */
	function choose(i) {
		if (committed) return;
		picked = i;
		choices.wallpaper = options[i].id;
		recordDraft({ format: 'wallpaper-choice', value: options[i].id, label: options[i].label });
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed) return;
		committed = true;
		setTimeout(() => onAnswer(options[choice].score), 340);
	}
</script>

<div class="wallpaper-pick">
	<h2><SplitText text={prompt} /></h2>
	<hr class="rule" />
	<div class="grid">
		{#each options as opt, i}
			<button
				class="card {opt.id}"
				data-reader-option={opt.label}
				data-answer-id={opt.id}
				aria-pressed={picked === i}
				class:picked={picked === i}
				style="--i: {i}"
				disabled={committed}
				onclick={() => choose(i)}
			>
				{#if opt.id === 'crazy'}
					<EmojiFloat emojis={EMOJIS} perEmoji={3} size="1rem" />
				{/if}
				<span class="label" data-reader-label>{opt.label}</span>
			</button>
		{/each}
	</div>
	<SubmitAnswer disabled={picked === null} {committed} delay={650} onsubmit={submit} />
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.wallpaper-pick > hr {
		margin: 0 0 1.75rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	.card {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 7.5rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		color: inherit;
		animation: rise 0.45s calc(0.25s + var(--i) * 80ms) both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.card:hover:not(:disabled) {
		transform: translateY(-3px);
		border-color: var(--ink);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
	}
	.card.picked {
		border-color: var(--ink);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
	}
	.card:disabled:not(.picked) {
		opacity: 0.55;
	}
	.label {
		position: relative;
		z-index: 1;
		font-size: 1.05rem;
		font-weight: 600;
		padding: 0.35rem 0.9rem;
		background: rgba(255, 255, 255, 0.82);
		border-radius: 999px;
	}

	/* 1 — Plain: nothing but a flat background. That's the point. */
	.plain {
		background: #f4f3f0;
	}

	/* 2 — Subtle pattern: a fine dot grid. */
	.dots {
		background-color: #f7f6f3;
		background-image: radial-gradient(circle, rgba(0, 0, 0, 0.16) 1px, transparent 1px);
		background-size: 14px 14px;
	}

	/* 3 — Go crazy: emojis floating up like balloons (shared EmojiFloat overlay).
	   Fewer instances here than the real wallpaper — it's a small preview tile. */
	.crazy {
		background: #fffbe8;
	}

	/* 4 — Gradient: light gray to even lighter gray. Riveting. */
	.gradient {
		background: linear-gradient(135deg, #dcdcdc 0%, #f6f6f6 100%);
	}

	@media (max-width: 520px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
