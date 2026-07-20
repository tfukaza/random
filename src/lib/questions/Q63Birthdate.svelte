<script>
	// birth-date — the astrology tell, asked with a completely straight face.
	//
	// Every fortune-telling quiz on the internet needs exactly one datum before
	// it can tell you who you are, and this is it. So the quiz asks for it, in
	// the flattest bureaucratic form it can manage, on the very first screen.
	//
	// THE SIGN APPEARS AS SOON AS THE DATE IS COMPLETE, stated as a field on the
	// form rather than announced — no glyph, no flourish, no sentence about what
	// it means. It is there to plant astrology early and to foreshadow
	// planet-alignment much later in chapter 4, so that when the quiz starts
	// arranging planets it reads as something it has been doing all along rather
	// than a swerve. Nothing after this question refers back to it, and the
	// results page does not mention it: the quiz reads your star sign and then
	// reaches its verdict by other means entirely.
	//
	// THREE SELECTS, NOT `<input type="date">`. A native date field renders as a
	// different control in every browser and drags a platform date-picker over
	// the letterhead. Day / month / year dropdowns read as an official form,
	// which is exactly the register the certificate aesthetic is going for.
	//
	// WHAT IS ACTUALLY SCORED is disclosure, not the date. The quiz has no way to
	// know whether a birth date is true, so scoring its content would be
	// pretending to a certainty it does not have — the one thing this quiz is
	// least entitled to do. Giving it up reads as open and unguarded; declining
	// reads as careful. Neither is wrong.
	//
	// THE DATE ITSELF IS NEVER RECORDED. Not to a server — nothing in this app
	// transmits anything — but also not into the metrics store, not into any
	// module state, and not into the URL. `recordDraft` is given the string
	// 'provided' or 'withheld' and nothing else, so the only trace of this
	// question anywhere in the running app is whether it was answered. The three
	// select values live in component state and die with the component.
	//
	// This is not a precaution about leaks, it is the deal. The quiz asks for
	// personal data as a joke about what quizzes ask for; actually keeping any of
	// it would make the joke true. Same rule applies to the security questions in
	// chapter 4. Do not add analytics here, and do not "just log it for debugging".
	import SplitText from '$lib/SplitText.svelte';
	import { cascade, ITEM_MS } from '$lib/reveal.js';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	let { onAnswer } = $props();

	const prompt = 'What is your date of birth?';

	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	const THIS_YEAR = 2026;
	const YEARS = Array.from({ length: 107 }, (_, i) => THIS_YEAR - i);

	let day = $state('');
	let month = $state('');
	let year = $state('');
	let declined = $state(false);
	let committed = $state(false);

	// Real month lengths, so 31 February is not offerable. February is given 29
	// unconditionally rather than leap-year-checked — the year select may still
	// be empty when the day list is built, and refusing to show the 29th to
	// someone born on it would be a worse bug than showing it to someone not.
	const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const dayCount = $derived(month === '' ? 31 : DAYS_IN[Number(month)]);
	const days = $derived(Array.from({ length: dayCount }, (_, i) => i + 1));

	// Shortening the month under a selected day would silently strand an invalid
	// date, so clear it instead and make the taker pick again.
	$effect(() => {
		if (day !== '' && Number(day) > dayCount) day = '';
	});

	// Sun-sign cutoffs, in order, as [month index, last day] of each span.
	// Capricorn appears twice because it straddles the year boundary.
	const ZODIAC = [
		{ name: 'Capricorn', until: [0, 19] },
		{ name: 'Aquarius', until: [1, 18] },
		{ name: 'Pisces', until: [2, 20] },
		{ name: 'Aries', until: [3, 19] },
		{ name: 'Taurus', until: [4, 20] },
		{ name: 'Gemini', until: [5, 20] },
		{ name: 'Cancer', until: [6, 22] },
		{ name: 'Leo', until: [7, 22] },
		{ name: 'Virgo', until: [8, 22] },
		{ name: 'Libra', until: [9, 22] },
		{ name: 'Scorpio', until: [10, 21] },
		{ name: 'Sagittarius', until: [11, 21] },
		{ name: 'Capricorn', until: [11, 31] }
	];

	// Needs BOTH day and month — a month alone spans two signs, and guessing
	// between them would be the one place this question is inaccurate about
	// something checkable. The year is irrelevant to it.
	const sign = $derived.by(() => {
		if (day === '' || month === '') return '';
		const m = Number(month);
		const d = Number(day);
		const span = ZODIAC.find(({ until }) => m < until[0] || (m === until[0] && d <= until[1]));
		return span?.name ?? '';
	});

	const complete = $derived(day !== '' && month !== '' && year !== '');
	const ready = $derived(complete || declined);

	function noteDraft() {
		declined = false;
		if (!complete) return;
		// Deliberately opaque — see the note at the top of this file.
		recordDraft({ format: 'date', value: 'provided', label: 'Date given' });
	}

	function decline() {
		if (committed) return;
		declined = true;
		day = '';
		month = '';
		year = '';
		recordDraft({ format: 'date', value: 'withheld', label: 'Would rather not say' });
	}

	function submit() {
		if (!ready || committed) return;
		committed = true;
		const delta = declined ? { risk: -2, social: -1 } : { risk: 1, social: 1 };
		setTimeout(() => onAnswer(delta), 420);
	}

	const seq = $derived.by(() => {
		const c = cascade();
		return { prompt: c.text(prompt), rule: c.rule(), fields: c.items(3), out: c.action() };
	});
</script>

<div class="birthdate">
	<h2><SplitText text={prompt} delay={seq.prompt} /></h2>
	<hr class="rule" style="animation-delay: {seq.rule}ms" />

	<div class="fields">
		<label class="field" style="animation-delay: {seq.fields}ms">
			<span class="field-label">Day</span>
			<select bind:value={day} onchange={noteDraft} disabled={committed}>
				<option value="">—</option>
				{#each days as d}<option value={String(d)}>{d}</option>{/each}
			</select>
		</label>

		<label class="field wide" style="animation-delay: {seq.fields + ITEM_MS}ms">
			<span class="field-label">Month</span>
			<select bind:value={month} onchange={noteDraft} disabled={committed}>
				<option value="">—</option>
				{#each MONTHS as m, i}<option value={String(i)}>{m}</option>{/each}
			</select>
		</label>

		<label class="field" style="animation-delay: {seq.fields + 2 * ITEM_MS}ms">
			<span class="field-label">Year</span>
			<select bind:value={year} onchange={noteDraft} disabled={committed}>
				<option value="">—</option>
				{#each YEARS as y}<option value={String(y)}>{y}</option>{/each}
			</select>
		</label>
	</div>

	{#if sign}
		<!-- Stated as another field on the form, not as a revelation. -->
		<p class="sign"><span class="sign-label">Sign</span><span class="sign-value">{sign}</span></p>
	{/if}

	<div class="actions" style="animation-delay: {seq.out}ms">
		<button class="ghost" class:chosen={declined} disabled={committed} onclick={decline}>
			I would rather not say
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
	.birthdate > hr {
		margin: 0 0 1.75rem;
	}
	.fields {
		display: flex;
		gap: 0.75rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		animation: rise 0.42s both;
	}
	.field.wide {
		flex: 1.6;
	}
	.field-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	select {
		width: 100%;
		padding: 0.8rem 0.9rem;
		font: inherit;
		font-size: 1rem;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}
	select:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	select:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.sign {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		margin: 1.5rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		animation: rise 0.35s both;
	}
	.sign-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--muted);
	}
	.sign-value {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
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

	@media (max-width: 520px) {
		.fields {
			flex-wrap: wrap;
		}
		.field.wide {
			flex-basis: 100%;
			order: -1;
		}
	}
</style>
