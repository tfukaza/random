<script>
	import { CATEGORIES, topCategory } from '$lib/scoring.js';
	import SplitText from '$lib/SplitText.svelte';
	import CountUp from '$lib/CountUp.svelte';

	let { scores, onRestart } = $props();

	const winner = $derived(topCategory(scores));
	// Sorted breakdown so the taker can see how close it was.
	const breakdown = $derived(
		CATEGORIES.map((c) => ({ ...c, score: scores[c.id] ?? 0 })).sort((a, b) => b.score - a.score)
	);
	const maxScore = $derived(Math.max(1, ...breakdown.map((b) => b.score)));

	// Bars start at 0 and grow to their real width one frame after mount.
	let grown = $state(false);
	$effect(() => {
		const raf = requestAnimationFrame(() => (grown = true));
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="result">
	<p class="eyebrow">You are…</p>
	<h1><SplitText text={winner.title} delay={250} stagger={45} /></h1>
	<hr class="rule rule--scotch" />
	<p class="blurb">{winner.blurb}</p>
	<div class="fleuron" aria-hidden="true">
		<hr class="rule" />
		<span>❦</span>
		<hr class="rule" />
	</div>

	<div class="breakdown">
		{#each breakdown as row, i}
			<div class="row" style="--i: {i}">
				<span class="row-label">{row.title}</span>
				<div class="bar-track">
					<div
						class="bar"
						style="width: {grown ? (row.score / maxScore) * 100 : 0}%; transition-delay: {700 +
							i * 120}ms"
					></div>
				</div>
				<span class="row-score"><CountUp value={row.score} delay={700 + i * 120} /></span>
			</div>
		{/each}
	</div>

	<button class="restart" onclick={onRestart}><span class="restart-label">Take it again</span></button>
	<p class="finis">· Finis ·</p>
	<div class="seal" aria-hidden="true"><span>❦</span></div>
</div>

<style>
	.result {
		text-align: center;
		padding-top: 1rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0 0 0.5rem;
		animation: rise 0.45s both;
	}
	h1 {
		margin: 0 0 1.25rem;
		font-size: 2.75rem;
	}
	.result .rule--scotch {
		margin: 0 0 1.5rem;
		animation: draw 0.6s 0.5s both;
	}
	.blurb {
		max-width: 42ch;
		margin: 0 auto 1.75rem;
		color: var(--muted);
		line-height: 1.6;
		text-align: left;
		animation: rise 0.5s 0.65s both;
	}
	.blurb::first-letter {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 2.9em;
		line-height: 0.8;
		float: left;
		padding: 0.08em 0.12em 0 0;
		color: var(--ink);
		font-weight: 600;
	}
	.fleuron {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 12rem;
		margin: 0 auto 1.75rem;
	}
	.fleuron .rule {
		flex: 1;
		animation: draw 0.5s 0.85s both;
	}
	.fleuron span {
		color: var(--ink);
		font-size: 1.1rem;
		line-height: 1;
		animation: rise 0.4s 0.8s both;
	}
	.breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		text-align: left;
		margin-bottom: 2.5rem;
	}
	.row {
		display: grid;
		grid-template-columns: 11rem 1fr 1.5rem;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		animation: rise 0.45s calc(0.85s + var(--i) * 120ms) both;
	}
	.bar-track {
		background: var(--border);
		height: 0.5rem;
		overflow: hidden;
	}
	.bar {
		height: 100%;
		background: var(--ink);
		transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.row-score {
		text-align: right;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.restart {
		position: relative;
		overflow: hidden;
		padding: 0.75rem 1.75rem;
		background: transparent;
		color: var(--ink);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		animation: rise 0.5s 1.4s both;
		transition: color 0.25s ease;
	}
	.restart::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--ink);
		transform: translateX(-101%);
		transition: transform 0.3s ease;
	}
	.restart:hover::before {
		transform: translateX(0);
	}
	.restart:hover {
		color: var(--bg);
	}
	.restart-label {
		position: relative;
	}
	.finis {
		text-transform: uppercase;
		letter-spacing: 0.25em;
		font-size: 0.7rem;
		color: var(--muted);
		margin: 2rem 0 0;
		animation: rise 0.5s 1.6s both;
	}
	/* Blind-embossed seal: no pigment, pure relief — the paper itself is
	   pressed, so every visible edge comes from light and shadow. */
	.seal {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		margin: 1.75rem auto 0;
		border-radius: 50%;
		background: var(--surface);
		transform: rotate(-6deg);
		box-shadow:
			inset 0 1px 2px rgba(255, 255, 255, 0.9),
			inset 0 -1px 2px rgba(0, 0, 0, 0.09),
			inset 0 0 0 1px rgba(0, 0, 0, 0.04),
			0 1px 1px rgba(0, 0, 0, 0.07);
		animation: rise 0.5s 1.8s both;
	}
	.seal::before {
		content: '';
		position: absolute;
		inset: 6px;
		border-radius: 50%;
		box-shadow:
			inset 0 1px 1px rgba(0, 0, 0, 0.07),
			inset 0 -1px 1px rgba(255, 255, 255, 0.9);
	}
	.seal span {
		font-size: 1.6rem;
		color: var(--surface);
		text-shadow:
			0 1px 1px rgba(255, 255, 255, 0.9),
			0 -1px 1px rgba(0, 0, 0, 0.18);
	}
	@media (max-width: 520px) {
		.row {
			grid-template-columns: 8rem 1fr 1.5rem;
			font-size: 0.8rem;
		}
	}
</style>
