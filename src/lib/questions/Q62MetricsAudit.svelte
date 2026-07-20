<script>
	// metrics-audit — the quiz opens its own instrument panel and shows the taker
	// the telemetry it has been collecting since question one, then asks whether
	// they accept it.
	//
	// This replaced time-audit, which showed the same kind of readout but then
	// asked an unrelated overthink/underthink question that decision-audit
	// already covers. The readout was the good part; the question attached to it
	// was redundant.
	//
	// WHY DISAGREEING COSTS HONESTY. The numbers are not an opinion — they are
	// what the taker did, measured while they did it. Rejecting them is not a
	// difference of interpretation, it is a refusal of evidence, and this quiz
	// charges for exactly that everywhere else. The panel is deliberately shown
	// in full first, so the disagreement is informed rather than reflexive.
	//
	// THE SHARPENING is against argument-replay (№8), where they said how much
	// they reflect after an argument. Claim you turn things over at length and
	// then be caught answering in under three seconds and it costs more; claim it
	// and have the clock back you up and it pays. Silent either way — nothing on
	// screen mentions question 8.
	//
	// Everything here is snapshotted at mount. This question is itself being
	// measured, and letting its own row move the numbers it is displaying would
	// be circular.
	import LikertPick from './LikertPick.svelte';
	import {
		averageDecisionSeconds,
		revisionRate,
		submittedAttempts,
		timingEntries,
		latestResponse
	} from '$lib/questions/metrics.svelte.js';

	let { onAnswer } = $props();

	const prompt = 'This is your current metric. Do you agree with it?';

	const answered = submittedAttempts().length;
	const avg = averageDecisionSeconds();
	const entries = timingEntries();
	const revisions = submittedAttempts().reduce((n, a) => n + a.revisionCount, 0);
	const rate = revisionRate();
	const fastest = entries.length ? Math.min(...entries.map((e) => e.ms)) / 1000 : 0;

	const rows = [
		{ label: 'Questions answered', value: String(answered) },
		{ label: 'Mean time per answer', value: `${avg.toFixed(1)}s` },
		{ label: 'Fastest answer', value: `${fastest.toFixed(1)}s` },
		{ label: 'Answers changed before submitting', value: String(revisions) }
	];

	const FAST_UNDER = 3;
	const SLOW_OVER = 7;
	const REFLECTIVE = 5; // on argument-replay's 0–7 scale

	// argument-replay is a slider; SliderPick records it as { format:'scalar',
	// value }. Null means a deep link past chapter 1 — no claim, no sharpening.
	const claim = latestResponse('argument-replay')?.value;
	const claimedReflective = typeof claim === 'number' && claim >= REFLECTIVE;

	const verdict = !claimedReflective
		? 'none'
		: avg > 0 && avg < FAST_UNDER
			? 'contradicted'
			: avg > SLOW_OVER
				? 'corroborated'
				: 'none';

	// Ordered weak → strong agreement, matching LikertPick.
	/** @type {Record<string, number>[]} */
	const BASE = [
		{ honesty: -3, scope: 1 },
		{ honesty: -2 },
		{},
		{ honesty: 1 },
		{ honesty: 2, scope: -1 }
	];

	/** @param {number} i */
	function toScore(i) {
		const delta = { ...BASE[i] };
		if (verdict === 'contradicted') delta.honesty = (delta.honesty ?? 0) - 2;
		else if (verdict === 'corroborated') delta.honesty = (delta.honesty ?? 0) + 2;
		// Keep the axis inside its conventional range — the sharpening stacks on
		// top of a base that already reaches ±3.
		if (delta.honesty !== undefined) {
			delta.honesty = Math.max(-3, Math.min(3, delta.honesty));
		}
		return delta;
	}
</script>

<LikertPick {prompt} {toScore} {onAnswer}>
	{#snippet children()}
		<!-- Presented as an instrument readout, not as an accusation. Per P6 there
		     is no commentary on the numbers — they are simply shown. -->
		<dl class="panel">
			{#each rows as row}
				<div class="row">
					<dt>{row.label}</dt>
					<dd>{row.value}</dd>
				</div>
			{/each}
		</dl>
	{/snippet}
</LikertPick>

<style>
	.panel {
		margin: 0 0 2rem;
		padding: 1.1rem 1.25rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0;
	}
	.row + .row {
		border-top: 1px solid var(--border);
	}
	dt {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
</style>
