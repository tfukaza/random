<script>
	// Q52 — the test of Q51's claim, and ONLY when that claim was a 7. The slot
	// branches on the endpoint, matching the patience lens: a 7 is an assertion
	// worth testing, anything from 1 to 6 is a preference, and the quiz has no
	// business retaliating against a preference. So 7 gets the second-derivative
	// problem and 1–6 get the bananas — an ordinary supermarket question with no
	// right answer at all.
	//
	// The bananas are not filler. Five a week is stated, so the answer is read
	// against a baseline: what the discount actually moved. Answering "5" means
	// half price moved you nothing; answering "20" means you bought fifteen
	// bananas you cannot eat because of a sign.
	//
	// Per P6 (never break character) this NEVER acknowledges the branch. It does
	// not say "you asked for this", and it never reveals whether the answer was
	// right — it simply records it and moves on, exactly like every other
	// question. The give-up button is the only thing that costs anything, and it
	// only exists on the math branch, because there is nothing to give up on when
	// the question is how many bananas you want.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import { makeProblem, parseTypedAnswer, isCorrect } from '$lib/mathProblems.js';
	import { latestResponse, recordDraft } from '$lib/questions/metrics.svelte.js';
	import SubmitAnswer from './SubmitAnswer.svelte';

	let { onAnswer } = $props();

	// Missing entry = deep-linked past Q51. Absence is not a boast, so it falls
	// to the bananas along with every other non-7. Read once — the orchestrator
	// remounts this component per question, so there is nothing to keep reactive.
	const claim = latestResponse('easy-or-hard')?.value;

	// One draw per mount. $state only so the dev panel can re-roll; nothing in
	// the normal flow reassigns it mid-answer. Null on the banana branch.
	let problem = $state(claim === 7 ? makeProblem(7) : null);

	const BANANAS = {
		heading: 'Bananas are 50% off today.',
		statement: 'You buy about five in a typical week.',
		field: 'How many do you buy?'
	};
	const USUAL = 5;

	const heading = $derived(problem ? 'Answer the following.' : BANANAS.heading);
	const statement = $derived(problem ? problem.promptText : BANANAS.statement);

	// heading → rule → statement → math → entry → actions (last).
	const seq = $derived.by(() => {
		const c = cascade();
		c.text(heading);
		const rule = c.rule();
		const statementAt = c.text(statement);
		const math = problem?.mathml ? c.block() : 0;
		const entry = c.block();
		return { rule, statement: statementAt, math, entry, actions: c.action() };
	});

	let typed = $state('');
	let committed = $state(false);
	let gaveUp = $state(false);

	const parsed = $derived(parseTypedAnswer(typed));

	// Graded against the stated five-a-week baseline: the axis being measured is
	// how far a discount can push you past what you actually need. Buying five is
	// immunity to the sign; buying twenty is the sign doing your shopping.
	/** @param {number} n */
	function bananaScore(n) {
		if (n <= USUAL) return { scope: -2, risk: -1, creative: -1 };
		if (n <= 9) return { scope: 1 };
		if (n <= 19) return { scope: 2, risk: 1, tempo: 1 };
		return { scope: 3, risk: 2, tempo: 2 };
	}

	/** @param {'answered' | 'gave-up'} outcome */
	function scoreFor(outcome) {
		if (!problem) return bananaScore(parsed ?? USUAL);
		if (outcome === 'gave-up') {
			// Only a 7 can reach this branch at all, so bailing is the full
			// contradiction of the boast every time — the same cross-check shape
			// Q49 runs against Q48.
			return { honesty: -3, tempo: 2 };
		}
		if (isCorrect(typed, problem)) return { scope: 2 };
		// A wrong answer costs nothing — it was an honest attempt.
		return {};
	}

	/** @param {'answered' | 'gave-up'} outcome */
	function commit(outcome) {
		if (committed) return;
		if (outcome === 'answered' && parsed === null) return;
		committed = true;
		const label = !problem
			? String(parsed)
			: outcome === 'gave-up'
				? 'gave-up'
				: isCorrect(typed, problem)
					? 'correct'
					: 'wrong';
		recordDraft({ format: 'numeric-entry', value: parsed, label });
		setTimeout(() => onAnswer(scoreFor(outcome)), 600);
	}

	function chooseGiveUp() {
		if (committed) return;
		gaveUp = true;
		recordDraft({ format: 'numeric-entry', value: null, label: 'gave-up' });
	}

	function editAnswer() {
		gaveUp = false;
		recordDraft({ format: 'numeric-entry', value: typed, label: typed });
	}

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
		}
	}
</script>

<div class="math-test">
	<h2><SplitText text={heading} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<p class="statement"><SplitText text={statement} delay={seq.statement} /></p>

	{#if problem?.mathml}
		<!-- Trusted, author-generated markup — the MathML is built from our own
		     templates and no taker input reaches it. Same trust model as the SVG
		     sprites in boxItems.js. -->
		<div class="math" role="math" aria-label={problem.plainMath} style="animation-delay: {seq.math}ms">
			{@html problem.mathml}
		</div>
	{/if}

	<div class="entry" style="animation-delay: {seq.entry}ms">
		<label class="field">
			<span class="field-label">{problem ? 'Your answer' : BANANAS.field}</span>
			<input
				type="text"
				inputmode="numeric"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				bind:value={typed}
				oninput={editAnswer}
				onkeydown={onKey}
				data-answer-id="numeric-answer"
				disabled={committed}
				placeholder="—"
			/>
		</label>
	</div>

	<div class="actions" style="animation-delay: {seq.actions}ms">
		<!-- Math branch only. "I give up" against "how many bananas" would read as
		     the quiz breaking character to sneer at an ordinary answer. -->
		{#if problem}
			<button
				class="ghost"
				class:selected={gaveUp}
				data-reader-option="I give up"
				data-answer-id="gave-up"
				aria-pressed={gaveUp}
				onclick={chooseGiveUp}
				disabled={committed}><span data-reader-label>I give up</span></button
			>
		{/if}
		<SubmitAnswer
			disabled={!gaveUp && parsed === null}
			{committed}
			label="Submit →"
			margin="0 0 0 auto"
			onsubmit={() => commit(gaveUp ? 'gave-up' : 'answered')}
		/>
	</div>
</div>

{#if import.meta.env.DEV}
	<aside class="debug">
		<p class="debug-title">🛠 debug · dev only</p>
		<p class="debug-note">Q51 claim: {claim ?? 'unset'} → {problem ? problem.tier : 'bananas'}</p>
		<p class="debug-note">answer: {problem ? problem.answer : 'n/a — no right answer'}</p>
		<div class="debug-row">
			<button onclick={() => (problem = null)}>bananas</button>
			{#each [2, 5, 7] as r}
				<button onclick={() => (problem = makeProblem(r))}>{r}</button>
			{/each}
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
	.ghost {
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
	}
</style>
