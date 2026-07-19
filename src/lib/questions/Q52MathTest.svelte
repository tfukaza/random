<script>
	// Q52 — the test of Q51's claim. Difficulty is chosen by what the taker just
	// said about themselves: 1–4 gets an arithmetic word problem, 5–6 a second
	// derivative, 7 a nastier one.
	//
	// Per P6 (never break character) this NEVER acknowledges the branch. It does
	// not say "you asked for this", and it never reveals whether the answer was
	// right — it simply records it and moves on, exactly like every other
	// question. The give-up button is the only thing that costs anything.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { makeProblem, parseTypedAnswer, isCorrect } from '$lib/mathProblems.js';
	import { ledger, logAnswer } from './ledger.svelte.js';

	let { onAnswer } = $props();

	// heading → rule → statement → math → entry → actions (last).
	const seq = $derived.by(() => {
		const c = cascade();
		c.text('Answer the following.');
		const rule = c.rule();
		const statement = c.text(problem.promptText);
		const math = problem.mathml ? c.block() : 0;
		const entry = c.block();
		return { rule, statement, math, entry, actions: c.action() };
	});

	// Missing entry = deep-linked past Q51; `tierForRating` falls back to easy
	// rather than guessing. Read once — the orchestrator remounts this component
	// per question, so there is nothing to keep reactive.
	const claim = ledger.answers.q51?.value;

	// One draw per mount. $state only so the dev panel can re-roll; nothing in
	// the normal flow reassigns it mid-answer.
	let problem = $state(makeProblem(claim));

	let typed = $state('');
	let committed = $state(false);

	const parsed = $derived(parseTypedAnswer(typed));

	/** @param {'answered' | 'gave-up'} outcome */
	function scoreFor(outcome) {
		if (outcome === 'gave-up') {
			// Bailing after claiming you love a challenge is a bigger contradiction
			// than bailing after admitting you like an easy life, so the cost scales
			// with the boast — the same cross-check shape Q49 runs against Q48.
			const bragged = typeof claim === 'number' ? claim : 4;
			return { honesty: -Math.max(1, Math.round((bragged - 1) / 2)), tempo: 2 };
		}
		if (isCorrect(typed, problem)) {
			return problem.tier === 'brutal'
				? { scope: 2 }
				: { scope: 1 };
		}
		// A wrong answer costs nothing — it was an honest attempt.
		return {};
	}

	/** @param {'answered' | 'gave-up'} outcome */
	function commit(outcome) {
		if (committed) return;
		if (outcome === 'answered' && parsed === null) return;
		committed = true;
		const right = outcome === 'answered' && isCorrect(typed, problem);
		logAnswer('q52', { label: outcome === 'gave-up' ? 'gave-up' : right ? 'correct' : 'wrong' });
		setTimeout(() => onAnswer(scoreFor(outcome)), 600);
	}

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit('answered');
		}
	}
</script>

<div class="math-test">
	<h2><SplitText text="Answer the following." /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<p class="statement"><SplitText text={problem.promptText} delay={seq.statement} /></p>

	{#if problem.mathml}
		<!-- Trusted, author-generated markup — the MathML is built from our own
		     templates and no taker input reaches it. Same trust model as the SVG
		     sprites in backpackItems.js. -->
		<div class="math" role="math" aria-label={problem.plainMath} style="animation-delay: {seq.math}ms">
			{@html problem.mathml}
		</div>
	{/if}

	<div class="entry" style="animation-delay: {seq.entry}ms">
		<label class="field">
			<span class="field-label">Your answer</span>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				bind:value={typed}
				onkeydown={onKey}
				disabled={committed}
				placeholder="—"
			/>
		</label>
	</div>

	<div class="actions" style="animation-delay: {seq.actions}ms">
		<button class="ghost" onclick={() => commit('gave-up')} disabled={committed}>I give up</button>
		<button class="next" onclick={() => commit('answered')} disabled={committed || parsed === null}>
			Submit →
		</button>
	</div>
</div>

{#if import.meta.env.DEV}
	<aside class="debug">
		<p class="debug-title">🛠 debug · dev only</p>
		<p class="debug-note">Q51 claim: {claim ?? 'unset'} → {problem.tier}</p>
		<p class="debug-note">answer: {problem.answer}</p>
		<div class="debug-row">
			{#each [2, 5, 7] as r}
				<button onclick={() => (problem = makeProblem(r))}>{r}</button>
			{/each}
			<button onclick={() => (problem = makeProblem(claim))}>reroll</button>
		</div>
	</aside>
{/if}

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.math-test > hr {
		margin: 0 0 1.5rem;
		animation: draw 0.4s both;
	}
	.statement {
		margin: 0 0 1.5rem;
		font-size: 1.05rem;
		line-height: 1.6;
	}

	/* Native MathML — no library, no webfonts. It inherits the page serif, which
	   is why it sits on the certificate without looking imported. */
	.math {
		margin: 0 0 2rem;
		padding: 1.25rem 0.5rem;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
		animation: rise 0.42s both;
	}
	.math :global(math) {
		font-size: 1.5rem;
		display: block;
		margin: 0.35rem 0;
	}

	.entry {
		margin-bottom: 1.75rem;
		animation: rise 0.42s both;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.field-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	/* type="text" + inputmode, not type="number": the number spinner is hostile
	   on mobile and silently swallows input it dislikes. */
	input {
		width: 100%;
		padding: 0.85rem 1rem;
		font: inherit;
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
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
		animation: rise 0.42s both;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.ghost,
	.next {
		padding: 0.75rem 1.5rem;
		font: inherit;
		font-weight: 600;
		border-radius: var(--radius);
		cursor: pointer;
	}
	.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--rule);
	}
	.ghost:hover:not(:disabled) {
		background: var(--accent-soft);
		color: inherit;
	}
	.next {
		margin-left: auto;
		background: var(--ink);
		color: var(--bg);
		border: none;
	}
	.next:disabled,
	.ghost:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.debug {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 50;
		width: 13rem;
		padding: 0.9rem;
		background: #fff;
		color: #111;
		border: 1px solid #d4d4d4;
		border-radius: 0.6rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		font-family: system-ui, sans-serif;
		font-size: 0.8rem;
	}
	.debug-title {
		margin: 0 0 0.5rem;
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #666;
	}
	.debug-note {
		margin: 0 0 0.35rem;
		color: #666;
	}
	.debug-row {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}
	.debug-row button {
		flex: 1;
		font: inherit;
		font-size: 0.72rem;
		padding: 0.25rem;
		border: 1px solid #ccc;
		border-radius: 0.35rem;
		background: #fff;
		cursor: pointer;
	}

	@media (max-width: 480px) {
		.actions {
			flex-direction: column-reverse;
		}
		.next {
			margin-left: 0;
		}
	}
</style>
