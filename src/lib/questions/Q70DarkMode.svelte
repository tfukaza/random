<script>
	// light-or-dark — the genre's most ordinary settings question, asked of a
	// quiz that is a paper certificate on a desk and therefore HAS no dark mode.
	// Answer dark and, on submit, the quiz obliges the only way paper can: the
	// room lights go down and a table lamp sputters on over the stack's
	// top-right corner (LampOverlay). It stays lit for the rest of the run, and
	// per P6 nothing ever mentions it.
	//
	// A custom component rather than PickList because the dark answer must HOLD
	// the question on screen while the lights-out and the lamp's catch play out
	// (~2.6s) before advancing — PickList hard-codes its 520ms submit beat.
	// Post-answer JS timing, so the PatienceLens rule is satisfied.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { lightLamp } from './lampState.svelte.js';

	let { onAnswer } = $props();

	const PROMPT = 'When you use a device, do you set it to light mode or dark mode?';

	const seq = (() => {
		const c = cascade();
		c.text(PROMPT, 40);
		return { rule: c.rule(), cards: c.block(), actions: c.action() };
	})();

	const OPTIONS = [
		{ id: 'light', label: 'Light mode', score: { social: 1, tempo: 1 } },
		{ id: 'dark', label: 'Dark mode', score: { creative: 1, social: -1, scope: -1 } }
	];

	let picked = $state(/** @type {number | null} */ (null));
	let committed = $state(false);

	function commit() {
		if (committed || picked === null) return;
		committed = true;
		const choice = OPTIONS[picked];
		recordDraft({ format: 'single-choice', value: choice.id, label: choice.label });
		if (choice.id === 'dark') {
			// The lights go out NOW — the overlay's whole arc (darken, sputter,
			// settle) is timed from this moment — and the question waits for the
			// entrance to finish before handing over. Nothing is announced.
			lightLamp();
			setTimeout(() => onAnswer(choice.score), 2600);
		} else {
			setTimeout(() => onAnswer(choice.score), 520);
		}
	}
</script>

<div class="theme-q">
	<h2><SplitText text={PROMPT} stagger={40} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="cards" style="animation-delay: {seq.cards}ms">
		{#each OPTIONS as option, i}
			<button
				class="card"
				class:selected={picked === i}
				data-reader-option={option.label}
				aria-pressed={picked === i}
				disabled={committed}
				onclick={() => (picked = i)}
			>
				<span data-reader-label>{option.label}</span>
			</button>
		{/each}
	</div>

	<div class="actions" style="animation-delay: {seq.actions}ms">
		<SubmitAnswer disabled={picked === null} {committed} onsubmit={commit} />
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.3;
	}
	.theme-q > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.5s 0.15s both;
	}
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1.75rem;
		animation: rise 0.42s both;
	}
	.card {
		padding: 1.1rem;
		font: inherit;
		text-align: center;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}
	.card:hover:not(:disabled) {
		background: var(--accent-soft);
	}
	.card.selected {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.card:disabled {
		cursor: default;
		opacity: 0.7;
	}
	.actions {
		animation: rise 0.42s both;
	}
	@media (max-width: 520px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>
