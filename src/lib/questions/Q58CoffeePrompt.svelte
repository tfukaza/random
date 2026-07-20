<script>
	// coffee-prompt — the bill for coffee-button, arriving one question later, and
	// the only place in the entire quiz that stops being a quiz.
	//
	// IT IS DELIBERATELY THE SAME QUESTION. Same small-text scenario, same
	// headline, same four rows — the only thing that changed is that the creator
	// is now this one, and the buttons are real. Nothing announces the parallel;
	// the taker either notices they are being asked the identical question about
	// the thing in front of them, or they don't.
	//
	// The three donate rows are IDENTICAL, not a ladder. A Ko-fi link cannot
	// preset an amount, so three differently-labelled buttons would all land on
	// the same page — and offering the same button three times where a ladder
	// should be is funnier than any of the amounts would have been.
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
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import {
		latestResponse,
		recordDraft,
		recordEvent,
		recordValidationFailure
	} from '$lib/questions/metrics.svelte.js';

	let { onAnswer, qNumber } = $props();

	const KOFI_URL = 'https://ko-fi.com/Y3X323IG5V';
	const KOFI_COUNT = 3;
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
			rows: c.items(KOFI_COUNT + 1),
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

	/** @type {boolean | null} */
	let gave = $state(null);

	// A valid code selects the support answer. Submission remains a separate
	// action, consistent with every other manual answer in the quiz.
	function redeem() {
		if (committed) return;
		if (!codeOk) {
			rejected = true;
			recordValidationFailure('invalid-donor-code');
			return;
		}
		gave = true;
		chosen = 'code';
		recordEvent('donor-code-redeemed', { target: 'ko-fi' });
		recordDraft({ format: 'external-choice', value: 'support', label: 'Valid donor code' });
	}

	// `gave` is a boolean because that is all the scoring needs, but three
	// identical Ko-fi buttons all satisfy `gave === true` — highlighting on that
	// alone lit up all three at once. `chosen` records which row was actually
	// pressed and exists purely for the selected state.
	/** @type {'decline' | 'code' | number | null} */
	let chosen = $state(null);

	/** @param {boolean} value @param {'decline' | 'code' | number} which */
	function select(value, which) {
		if (committed) return;
		gave = value;
		chosen = which;
		recordDraft({
			format: 'external-choice',
			value: value ? 'support' : 'decline',
			label: value ? 'Support me on Ko-fi' : "Don't donate"
		});
		if (value) recordEvent('external-link-opened', { target: 'ko-fi' });
	}

	function commit() {
		if (gave === null || committed) return;
		committed = true;
		const delta = gave
			? { honesty: 3, coord: 2, social: 1 }
			: pledged
				? { honesty: WALKED_BACK[pledgeIndex ?? 0] ?? -1, coord: -1 }
				: // Said no last question and says no now. The quiz has no quarrel
					// with someone who never claimed otherwise.
					{ honesty: 2, coord: -1 };
		setTimeout(() => onAnswer(delta), 520);
	}
</script>

<div class="coffee">
	<p class="premise"><SplitText text={premise} delay={seq.premise} /></p>
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="rows">
		<button
			class="decline"
			class:selected={chosen === 'decline'}
			data-sfx="none"
			data-reader-option="Don't donate"
			data-answer-id="decline"
			aria-pressed={gave === false}
			style="animation-delay: {seq.rows}ms"
			disabled={committed}
			onclick={() => select(false, 'decline')}
		>
			<span data-reader-label>Don't donate</span>
		</button>

		{#each Array(KOFI_COUNT) as _, i}
			<a
				class="kofi"
				class:selected={chosen === i}
				href={KOFI_URL}
				target="_blank"
				rel="noopener noreferrer"
				data-sfx="none"
				data-reader-option="Support me on Ko-fi"
				data-answer-id="support-{i + 1}"
				style="animation-delay: {seq.rows + (i + 1) * ITEM_MS}ms"
				onclick={() => select(true, i)}
			>
				<svg class="cup" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/>
					<path
						d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
				<span data-reader-label>Support me on Ko-fi</span>
			</a>
		{/each}

		<div class="redeem" style="animation-delay: {seq.rows + (KOFI_COUNT + 1) * ITEM_MS}ms">
			<label class="redeem-label" for="donor-code">Already donated? Enter your code.</label>
			<div class="redeem-row">
				<input
					id="donor-code"
					type="text"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder="—"
					bind:value={code}
					oninput={() => (rejected = false)}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							redeem();
						}
					}}
					disabled={committed}
				/>
				<button class="redeem-go" onclick={redeem} disabled={committed || !code.trim()}>
					Use code
				</button>
			</div>
			{#if rejected}
				<p class="redeem-note">That code is not recognised.</p>
			{:else if chosen === 'code'}
				<p class="redeem-note accepted">Code accepted.</p>
			{/if}
		</div>
	</div>
	<SubmitAnswer disabled={gave === null} {committed} delay={seq.submit} onsubmit={commit} />
</div>

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
	/* The button is already saturated blue, so selection reads as a ring plus a
	   deeper fill rather than the accent-soft treatment used on plain cards. */
	.kofi.selected {
		background: #4d84dd;
		box-shadow:
			0 0 0 2px var(--ink),
			0 2px 8px rgba(114, 164, 242, 0.35);
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
	.redeem-row {
		display: flex;
		gap: 0.6rem;
	}
	.redeem-row input {
		flex: 1;
		min-width: 0;
		padding: 0.8rem 1rem;
		font: inherit;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
	}
	.redeem-row input:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.redeem-go {
		padding: 0.8rem 1.3rem;
		font: inherit;
		font-weight: 600;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		white-space: nowrap;
	}
	.redeem-go:disabled {
		opacity: 0.45;
		cursor: default;
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
