<script>
	import { onMount } from 'svelte';
	import { axisSummary } from '$lib/scoring.js';
	import { typeOf } from '$lib/personalities.js';
	import { buildShareText } from '$lib/shareText.js';
	import SplitText from '$lib/SplitText.svelte';
	import CountUp from '$lib/CountUp.svelte';
	import { playSfx, setMusicRate, setMusicTrack } from '$lib/audio/audio.svelte.js';

	let { scores, onRestart } = $props();

	onMount(() => {
		setMusicRate(1);
		void setMusicTrack('report', { restart: true });
		void playSfx('result-reveal');
	});

	// The headline identity: one of the 128 seven-axis types.
	const persona = $derived(typeOf(scores));

	// Temperament spectra: seven signed axes, each rendered as a diverging bar
	// from a center-zero line. Shared scale so bar lengths are comparable.
	const axes = $derived(axisSummary(scores));
	const maxAxis = $derived(Math.max(4, ...axes.map((a) => Math.abs(a.value))));

	// Reveal timing. The report arrives in two acts — the specimen, then the
	// findings — with a deliberate pause between them so the verdict lands before
	// the evidence starts assembling under it. These must stay in step with
	// --act1 / --act2 in the stylesheet below; they exist because bar widths and
	// CountUp are driven from JS rather than CSS.
	const ACT1_MS = 150;
	const ACT2_MS = 4200;
	const NAME_MS = ACT1_MS + 1400;
	const AXIS_MS = ACT2_MS + 2300;
	const AXIS_STEP_MS = 120;

	// Bars start at 0 and grow to their real width one frame after mount.
	let grown = $state(false);
	$effect(() => {
		const raf = requestAnimationFrame(() => (grown = true));
		return () => cancelAnimationFrame(raf);
	});

	// Copy the verdict as plain text. `navigator.clipboard` needs a secure
	// context and a permission that can be refused, so a refusal falls back to
	// a selectable textarea rather than failing silently.
	const shareText = $derived(buildShareText(persona, axes));
	let copied = $state(false);
	let manual = $state(false);
	/** @type {HTMLTextAreaElement | undefined} */
	let manualBox = $state();
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let copiedTimer;

	async function copyResults() {
		try {
			await navigator.clipboard.writeText(shareText);
			copied = true;
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (copied = false), 2400);
		} catch {
			manual = true;
			// Wait for the textarea to exist before selecting its contents.
			requestAnimationFrame(() => manualBox?.select());
		}
	}

	$effect(() => () => clearTimeout(copiedTimer));
</script>

<div class="result">
	<p class="eyebrow">You are…</p>
	<p class="type-code">Type {persona.code}</p>

	<!-- The plant is offered without justification, comment, or any suggestion
	     that a plant is an unusual thing to be told you are. -->
	<figure class="plate">
		<div class="plate-frame">
			<img src={persona.plant.file} alt="" loading="eager" />
		</div>
		<figcaption>
			<h1><SplitText text={persona.plant.common} delay={NAME_MS} stagger={60} /></h1>
			<p class="binomial">{persona.plant.scientific}</p>
		</figcaption>
	</figure>

	<p class="credit">
		Photo: <a href={persona.plant.sourceUrl} target="_blank" rel="noopener noreferrer"
			>{persona.plant.artist}</a
		>
		—
		{#if persona.plant.licenseUrl}
			<a href={persona.plant.licenseUrl} target="_blank" rel="noopener noreferrer"
				>{persona.plant.license}</a
			>
		{:else}
			{persona.plant.license}
		{/if}
		, via Wikimedia Commons
	</p>

	<hr class="rule rule--scotch" />
	<p class="blurb">{persona.blurb}</p>
	<!-- The reading: where the certificate briefly becomes human. -->
	<p class="reading">{persona.reading}</p>
	<div class="fleuron" aria-hidden="true">
		<hr class="rule" />
		<span>❦</span>
		<hr class="rule" />
	</div>

	<p class="section-head">Temperament profile</p>
	<div class="spectra">
		{#each axes as axis, i}
			<div class="axis" style="--i: {i}">
				<span class="pole pole--neg" class:won={axis.value < 0}>{axis.negLabel}</span>
				<div class="spectrum">
					<div class="center-line"></div>
					<div
						class="axis-bar"
						class:neg={axis.value < 0}
						style="width: {grown ? (Math.abs(axis.value) / maxAxis) * 50 : 0}%; transition-delay: {AXIS_MS +
							i * AXIS_STEP_MS}ms"
					></div>
				</div>
				<span class="pole pole--pos" class:won={axis.value >= 0}>{axis.posLabel}</span>
				<span class="axis-score"
					>{axis.value > 0 ? '+' : ''}<CountUp value={axis.value} delay={AXIS_MS + i * AXIS_STEP_MS} /></span
				>
			</div>
		{/each}
	</div>

	<div class="actions">
		<button class="ink-button" onclick={copyResults} aria-live="polite">
			<span class="ink-label">{copied ? 'Copied' : 'Copy results'}</span>
		</button>
		<button class="ink-button" onclick={onRestart}><span class="ink-label">Take it again</span></button>
	</div>

	{#if manual}
		<!-- Clipboard access refused or unavailable: hand over the text instead. -->
		<label class="manual">
			<span>Your browser would not let us copy. Select and copy:</span>
			<textarea bind:this={manualBox} readonly rows="12" value={shareText}></textarea>
		</label>
	{/if}
	<p class="finis">· Finis ·</p>
	<div class="seal" aria-hidden="true"><span>❦</span></div>
</div>

<style>
	.result {
		text-align: center;
		padding-top: 1rem;
		/* Act I — the specimen. Act II — the findings. The gap is the point: the
		   verdict should be sat with before the evidence assembles beneath it.
		   Every delay below is relative to one of these, so the whole ceremony
		   retimes from two numbers. Mirrored in the script as ACT1_MS/ACT2_MS. */
		--act1: 0.15s;
		--act2: 4.2s;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0 0 0.5rem;
		animation: rise 0.7s var(--act1) both;
	}
	.type-code {
		text-transform: uppercase;
		letter-spacing: 0.32em;
		font-size: 0.68rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.75rem;
		animation: rise 0.7s calc(var(--act1) + 0.45s) both;
	}
	/* The specimen plate: a mounted photograph with its label. `contain` on a
	   fixed frame normalises wildly different source shapes (portrait ferns,
	   landscape trees) without cropping — the file stays exactly as it was
	   downloaded, so no derivative is created and the ShareAlike terms on most
	   of these photographs are never engaged. */
	.plate {
		margin: 0 0 0.5rem;
	}
	.plate-frame {
		display: flex;
		align-items: center;
		justify-content: center;
		height: clamp(11rem, 38vw, 14rem);
		padding: 0.75rem;
		background: var(--accent-soft);
		border: 1px solid var(--border);
		animation: rise 0.8s calc(var(--act1) + 0.9s) both;
	}
	.plate-frame img {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
	}
	.plate figcaption {
		margin-top: 1.1rem;
	}
	h1 {
		margin: 0 0 0.35rem;
		font-size: clamp(2rem, 7vw, 2.75rem);
		text-wrap: balance;
	}
	.binomial {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.15rem;
		color: var(--muted);
		animation: rise 0.7s calc(var(--act1) + 2s) both;
	}
	.credit {
		margin: 0.85rem 0 1.5rem;
		font-size: 0.62rem;
		letter-spacing: 0.02em;
		color: var(--muted);
		animation: rise 0.7s calc(var(--act1) + 2.4s) both;
	}
	.credit a {
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.credit a:hover {
		color: var(--ink);
	}
	.result .rule--scotch {
		margin: 0 0 1.5rem;
		animation: draw 0.8s var(--act2) both;
	}
	.blurb {
		max-width: 42ch;
		margin: 0 auto 1.75rem;
		color: var(--muted);
		line-height: 1.6;
		text-align: left;
		animation: rise 0.7s calc(var(--act2) + 0.4s) both;
	}
	.reading {
		max-width: 46ch;
		margin: 0 auto 1.75rem;
		color: var(--muted);
		line-height: 1.7;
		font-size: 0.95rem;
		animation: rise 0.7s calc(var(--act2) + 1s) both;
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
		animation: draw 0.7s calc(var(--act2) + 1.9s) both;
	}
	.fleuron span {
		color: var(--ink);
		font-size: 1.1rem;
		line-height: 1;
		animation: rise 0.6s calc(var(--act2) + 1.85s) both;
	}
	.section-head {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: var(--muted);
		margin: 0 0 1rem;
		animation: rise 0.7s calc(var(--act2) + 2.15s) both;
	}
	.spectra {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		margin-bottom: 2.5rem;
	}
	.axis {
		display: grid;
		grid-template-columns: 8.5rem 1fr 8.5rem 2.25rem;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		animation: rise 0.7s calc(var(--act2) + 2.3s + var(--i) * 120ms) both;
	}
	.pole {
		color: var(--muted);
	}
	.pole--neg {
		text-align: right;
	}
	.pole--pos {
		text-align: left;
	}
	.pole.won {
		color: var(--ink);
		font-weight: 600;
	}
	.spectrum {
		position: relative;
		height: 0.5rem;
		background: var(--accent-soft);
	}
	.center-line {
		position: absolute;
		left: 50%;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--rule);
	}
	.axis-bar {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		background: var(--ink);
		transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.axis-bar.neg {
		left: auto;
		right: 50%;
	}
	.axis-score {
		text-align: right;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 560px) {
		.axis {
			grid-template-columns: 6rem 1fr 6rem 2rem;
			font-size: 0.68rem;
		}
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}
	.ink-button {
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
		animation: rise 0.7s calc(var(--act2) + 3.5s) both;
		transition: color 0.25s ease;
	}
	.ink-button::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--ink);
		transform: translateX(-101%);
		transition: transform 0.3s ease;
	}
	.ink-button:hover::before {
		transform: translateX(0);
	}
	.ink-button:hover {
		color: var(--bg);
	}
	.ink-label {
		position: relative;
	}
	.manual {
		display: block;
		max-width: 26rem;
		margin: 1.25rem auto 0;
		text-align: left;
	}
	.manual span {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.72rem;
		color: var(--muted);
	}
	.manual textarea {
		width: 100%;
		padding: 0.7rem;
		background: var(--surface);
		color: var(--ink);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		resize: vertical;
	}
	.finis {
		text-transform: uppercase;
		letter-spacing: 0.25em;
		font-size: 0.7rem;
		color: var(--muted);
		margin: 2rem 0 0;
		animation: rise 0.7s calc(var(--act2) + 3.8s) both;
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
		animation: rise 0.7s calc(var(--act2) + 4.1s) both;
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
</style>
