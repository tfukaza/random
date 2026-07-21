<script>
	// coffee-prompt — the bill for coffee-button, arriving one question later.
	// A taker who pledged money gets the real Ko-fi ask; someone who declined gets
	// a normal follow-up about what could motivate them instead.
	//
	// The pledged branch keeps the same small-text scenario and headline, but the
	// controls are deliberately simple: one real Ko-fi link, one decline choice,
	// then one code field whose Submit button owns the final answer.
	//
	// THE KO-FI BUTTONS DO NOT ADVANCE. They open the donation page and leave the
	// question sitting there, because the way forward is the code you get after
	// donating. That is the actual joke: you pay a dollar, you are issued a secret
	// code, you come back and enter it, and your reward is question 28.
	//
	// The code is a plain string compared in the browser, which means it is
	// sitting in the bundle for anyone who opens devtools. That is fine and
	// deliberate — there is nothing behind the gate but the next question, and
	// "Don't donate" is right there anyway. Do not add real verification; it
	// would cost a server round-trip to protect a joke.
	//
	// Per P6 the question does not explain itself, apologise, or acknowledge that
	// anything unusual just happened. It cannot be dodged by inaction either —
	// "Don't donate" is a real row that scores and advances like any other.
	//
	// WHY A LINK AND NOT KO-FI'S WIDGET. The official embed snippet calls
	// `document.write` from `kofiwidget2.draw()`, which only works while the page
	// is still parsing; injected into a mounted SPA it would blow away the whole
	// document. Beyond that, the widget pulls a script, a webfont and images from
	// third-party hosts on render — and clause 4 of the terms this taker accepted
	// a few questions ago states that nothing is transmitted to any third party.
	// A plain anchor keeps that true: nothing leaves the page until the taker
	// chooses to click.
	//
	// The href uses the account CODE rather than the vanity name — it survives a
	// username change, and ko-fi.com resolves it to the profile.
	import SplitText from '$lib/SplitText.svelte';
	import { cascade } from '$lib/reveal.js';
	import PickList from './PickList.svelte';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import {
		latestResponse,
		recordDraft,
		recordEvent,
		recordValidationFailure
	} from '$lib/questions/metrics.svelte.js';

	let { onAnswer, qNumber } = $props();

	const KOFI_URL = 'https://ko-fi.com/Y3X323IG5V';
	const SECRET_CODE = 'Quiz789';

	// The quiz describes itself in the third person, at exactly the pitch a
	// stranger would use — modest, unimpressed, accurate. The question number is
	// interpolated so it is always the one they are actually looking at, which
	// also means it stays correct through any reorder of flowOrder.
	const premise = $derived(
		'You come across a personality quiz with an interesting twist on the traditional format. It is not anything crazy or mind-blowing, but you are invested enough to have reached question ' +
			qNumber +
			'.'
	);
	const prompt = 'How much are you willing to donate?';
	const motivationPrompt = 'What would motivate you to donate money?';
	const motivationOptions = [
		{
			label: 'A clear explanation of exactly what the money would fund',
			score: { scope: -2, creative: -1 }
		},
		{
			label: 'Something useful or exclusive in return',
			score: { coord: -1, creative: -1, risk: -1 }
		},
		{
			label: 'Knowing the work might not continue without support',
			score: { coord: 2, social: 1 }
		},
		{
			label: 'A stronger personal connection with the creator',
			score: { social: 2, coord: 1 }
		}
	];

	// Read once — the orchestrator remounts per question.
	const pledgeIndex = latestResponse('coffee-button')?.value;
	const pledged = typeof pledgeIndex === 'number' && pledgeIndex > 0;

	// Index 1/2/3 on coffee-button = $1/$5/$10. Walking back a dollar is close to
	// a shrug; walking back ten, volunteered unprompted, is the contradiction
	// this question exists to catch.
	const WALKED_BACK = [0, -1, -2, -3];

	const seq = $derived.by(() => {
		const c = cascade();
		return {
			premise: c.text(premise),
			prompt: c.text(prompt),
			rule: c.rule(),
			rows: c.items(2),
			submit: c.action()
		};
	});

	let committed = $state(false);
	let code = $state('');
	let rejected = $state(false);

	// Trimmed and case-insensitive: the taker is copying this off another page,
	// and losing to a trailing space or a capital Q would be a worse joke than
	// the one being told.
	const codeOk = $derived(code.trim().toLowerCase() === SECRET_CODE.toLowerCase());

	/** @type {'decline' | 'code' | null} */
	let chosen = $state(null);

	function selectDecline() {
		if (committed) return;
		chosen = 'decline';
		code = '';
		rejected = false;
		recordDraft({
			format: 'external-choice',
			value: 'decline',
			label: "Don't donate"
		});
	}

	function openKofi() {
		if (!committed) recordEvent('external-link-opened', { target: 'ko-fi' });
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function editCode(event) {
		rejected = false;
		if (/** @type {HTMLInputElement} */ (event.currentTarget).value.trim()) chosen = null;
	}

	/** @param {boolean} gave */
	function finish(gave) {
		committed = true;
		const delta = gave
			? { honesty: 3, coord: 2, social: 1 }
			: { honesty: WALKED_BACK[pledgeIndex ?? 0] ?? -1, coord: -1 };
		setTimeout(() => onAnswer(delta), 520);
	}

	// This is both the old "Use code" action and the final Submit action. A
	// decline needs no code; support must validate the code before committing.
	function submit() {
		if (committed) return;
		if (chosen === 'decline') {
			finish(false);
			return;
		}
		if (!codeOk) {
			rejected = true;
			recordValidationFailure('invalid-donor-code');
			return;
		}
		chosen = 'code';
		recordEvent('donor-code-redeemed', { target: 'ko-fi' });
		recordDraft({ format: 'external-choice', value: 'support', label: 'Valid donor code' });
		finish(true);
	}
</script>


{#if !pledged}
	<PickList
		premise={premise}
		prompt={motivationPrompt}
		options={motivationOptions}
		{onAnswer}
	/>
{:else}
<div class="coffee">
	<p class="premise"><SplitText text={premise} delay={seq.premise} /></p>
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="rows">
		<a
			class="kofi"
			href={KOFI_URL}
			target="_blank"
			rel="noopener noreferrer"
			data-sfx="none"
			data-reader-option="Support me on Ko-Fi"
			data-answer-id="support"
			style="animation-delay: {seq.rows}ms"
			onclick={openKofi}
		>
			<svg class="cup" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
				<path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<span data-reader-label>Support me on Ko-Fi</span>
		</a>

		<button
			class="decline"
			class:selected={chosen === 'decline'}
			data-sfx="none"
			data-reader-option="Don't donate"
			data-answer-id="decline"
			aria-pressed={chosen === 'decline'}
			style="animation-delay: {seq.rows + 80}ms"
			disabled={committed}
			onclick={selectDecline}
		>
			<span data-reader-label>Don't donate</span>
		</button>

		<div class="redeem" style="animation-delay: {seq.rows + 160}ms">
			<label class="redeem-label" for="donor-code">Enter the code and submit answer.</label>
				<input
					id="donor-code"
					type="text"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder="—"
					bind:value={code}
					oninput={editCode}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							submit();
						}
					}}
					disabled={committed}
				/>
			<SubmitAnswer
				disabled={chosen !== 'decline' && !code.trim()}
				{committed}
				delay={seq.submit}
				margin="0.75rem 0 0 auto"
				onsubmit={submit}
			/>
			{#if rejected}
				<p class="redeem-note">That code is not recognised.</p>
			{:else if chosen === 'code'}
				<p class="redeem-note accepted">Code accepted.</p>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.premise {
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.6;
		margin: 0 0 1rem;
	}
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.coffee > hr {
		margin: 0 0 1.75rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	/* Deliberately the plainest thing on the page, so the three below it are the
	   ones that look like they came from somewhere else. */
	.decline {
		padding: 1rem 1.15rem;
		font: inherit;
		font-weight: 500;
		color: inherit;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		animation: rise 0.42s both;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease;
	}
	.decline:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--ink);
	}
	.decline:disabled {
		cursor: default;
		opacity: 0.55;
	}
	/* Matches .card.picked elsewhere in the quiz, so a selected answer looks the
	   same here as it does on every other question. */
	.decline.selected {
		border-color: var(--ink);
		background: var(--accent-soft);
	}
	.decline.selected:disabled {
		opacity: 1;
	}

	/* Ko-fi's own brand blue, on a page that has been grey and serif for twenty
	   questions. They are supposed to look like they came from somewhere else,
	   because they did. */
	.kofi {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.95rem 1.6rem;
		background: #72a4f2;
		color: #fff;
		border-radius: 12px;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		box-shadow: 0 2px 8px rgba(114, 164, 242, 0.35);
		animation: rise 0.42s both;
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease;
	}
	.kofi:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 14px rgba(114, 164, 242, 0.5);
	}
	.kofi:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}
	.redeem {
		margin-top: 0.4rem;
		animation: rise 0.42s both;
	}
	.redeem-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	.redeem input {
		width: 100%;
		padding: 0.8rem 1rem;
		font: inherit;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
	.redeem input:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.redeem-note {
		margin: 0.6rem 0 0;
		font-size: 0.78rem;
		font-style: italic;
		color: var(--muted);
	}
	.redeem-note.accepted {
		color: var(--ink);
	}
	.cup {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}
</style>
