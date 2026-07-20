<script>
	// Shared presentational helper for the free-text personal questions: a prompt,
	// one line of input, and a way to refuse. Used by the chapter-4 security-
	// question run (favourite-food → childhood-street → mothers-maiden-name).
	//
	// WHAT THE TAKER TYPES IS NEVER RECORDED. `recordDraft` receives the literal
	// string 'provided' or 'withheld' and nothing else. The typed value lives in
	// this component's state and dies with it — it is not written to the metrics
	// store, not to module state, not to the URL, and nothing in this app
	// transmits anything anywhere. Consumers get told *whether* the taker
	// answered, never what they said.
	//
	// That constraint is the whole point rather than an implementation detail.
	// These questions are a joke about what quizzes feel entitled to ask; keeping
	// any of the answers would stop it being a joke. If a future question wants
	// to pay this off, it can read `provided`/`withheld` — that is enough to know
	// how guarded somebody was, and it is all the quiz is entitled to.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from './metrics.svelte.js';

	/** @type {{
	 *   prompt: string,
	 *   placeholder?: string,
	 *   declineLabel?: string,
	 *   provided: Record<string, number>,
	 *   withheld: Record<string, number>,
	 *   onAnswer: (delta: Record<string, number>) => void
	 * }} */
	let {
		prompt,
		placeholder = '',
		declineLabel = 'I would rather not say',
		provided,
		withheld,
		onAnswer
	} = $props();

	let text = $state('');
	let declined = $state(false);
	let committed = $state(false);

	const filled = $derived(text.trim().length > 0);
	const ready = $derived(filled || declined);

	function onType() {
		declined = false;
		if (!filled) return;
		// Opaque by design — see the note above.
		recordDraft({ format: 'text', value: 'provided', label: 'Answer given' });
	}

	function decline() {
		if (committed) return;
		declined = true;
		text = '';
		recordDraft({ format: 'text', value: 'withheld', label: 'Would rather not say' });
	}

	function submit() {
		if (!ready || committed) return;
		committed = true;
		// The text is not passed on, only which branch was taken.
		setTimeout(() => onAnswer(declined ? withheld : provided), 420);
	}

	const seq = $derived.by(() => {
		const c = cascade();
		return { prompt: c.text(prompt), rule: c.rule(), field: c.block(), out: c.action() };
	});
</script>

<div class="text-ask">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="field" style="animation-delay: {seq.field}ms">
		<input
			type="text"
			autocomplete="off"
			autocapitalize="off"
			autocorrect="off"
			spellcheck="false"
			{placeholder}
			bind:value={text}
			oninput={onType}
			onkeydown={(e) => e.key === 'Enter' && submit()}
			disabled={committed}
		/>
	</div>

	<div class="actions" style="animation-delay: {seq.out}ms">
		<button class="ghost" class:chosen={declined} disabled={committed} onclick={decline}>
			{declineLabel}
		</button>
		<SubmitAnswer disabled={!ready} {committed} delay={seq.out} margin="0 0 0 auto" onsubmit={submit} />
	</div>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		line-height: 1.25;
	}
	.text-ask > hr {
		margin: 0 0 1.75rem;
	}
	.field {
		animation: rise 0.42s both;
	}
	input {
		width: 100%;
		padding: 0.85rem 1rem;
		font: inherit;
		font-size: 1.15rem;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
	input:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	input:disabled {
		opacity: 0.6;
	}

	.actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
		animation: rise 0.42s both;
	}
	.ghost {
		padding: 0.75rem 1.25rem;
		font: inherit;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}
	.ghost:hover:not(:disabled) {
		background: var(--accent-soft);
		color: inherit;
	}
	.ghost.chosen {
		border-color: var(--ink);
		background: var(--accent-soft);
		color: inherit;
	}
	.ghost:disabled {
		cursor: default;
		opacity: 0.55;
	}
</style>
