<script>
	// Q20 — combines Q16 (font), Q17 (palette), Q18 (button style), and Q19
	// (wallpaper). This whole question restyles itself from the taker's earlier
	// taste choices: pick a nice font + palette + button + wallpaper and it looks
	// great; pick Comic Sans + neon + bubbly + flying emojis and it looks hideous.
	// That contrast IS the joke.
	//
	// A dev-only debug sidebar lets you override each choice live to preview
	// combinations. It's gated behind import.meta.env.DEV, so it's automatically
	// stripped from production builds — no manual removal needed.
	import { FONTS } from '$lib/design/fonts.js';
	import { PALETTES, readableOn } from '$lib/design/palettes.js';
	import { BUTTON_VARIANTS } from '$lib/design/buttons.js';
	import { choices } from '$lib/design/choices.svelte.js';
	import EmojiFloat from './EmojiFloat.svelte';
	let { onAnswer } = $props();

	const prompt = 'I consider myself to have an artistic side.';
	const LIKERT = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

	const WALLPAPERS = [
		{ id: 'plain', label: 'Plain background' },
		{ id: 'dots', label: 'Subtle pattern' },
		{ id: 'crazy', label: 'Go crazy' },
		{ id: 'gradient', label: 'Gradient' }
	];
	const EMOJIS = ['🎉', '🦄', '🍕', '✨', '🐸', '🚀', '💫', '🌈'];

	// Debug overrides (empty string = "use the earlier answer").
	let fontOverride = $state('');
	let paletteOverride = $state('');
	let variantOverride = $state('');
	let wallpaperOverride = $state('');

	// Effective design: debug override → earlier answer → sensible default.
	const font = $derived(FONTS.find((f) => f.id === fontOverride) ?? choices.font ?? FONTS[0]);
	const palette = $derived(
		PALETTES.find((p) => p.id === paletteOverride) ?? choices.palette ?? PALETTES[3]
	);
	const variant = $derived(variantOverride || choices.button || 'simple');
	const wallpaper = $derived(wallpaperOverride || choices.wallpaper || 'plain');

	const roles = $derived(palette.roles);
	const btnText = $derived(readableOn(roles.accent));

	/** Hex → rgba() with the given alpha. @param {string} hex @param {number} a */
	function rgba(hex, a) {
		const n = parseInt(hex.slice(1), 16);
		return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
	}

	// The wallpaper pattern is drawn in the palette's own colors: dots use the
	// text color at low opacity, the gradient runs from the bg toward white.
	const frameBg = $derived.by(() => {
		if (wallpaper === 'dots')
			return `radial-gradient(circle, ${rgba(roles.text, 0.22)} 1px, transparent 1px) 0 0 / 14px 14px, ${roles.bg}`;
		if (wallpaper === 'gradient')
			return `linear-gradient(135deg, ${roles.bg} 0%, color-mix(in srgb, ${roles.bg} 55%, white) 100%)`;
		// plain and crazy are both a flat palette background (crazy adds emojis on top)
		return roles.bg;
	});

	// Theme the whole question card: while this question is mounted, the paper
	// frame takes the palette background, and the № badge picks up the chosen
	// font + a text color that stays legible on that background. All restored
	// on unmount.
	$effect(() => {
		const frame = /** @type {HTMLElement | null} */ (document.querySelector('.frame'));
		if (!frame) return;
		const numeral = /** @type {HTMLElement | null} */ (frame.querySelector('.numeral'));
		const prev = { bg: frame.style.background, transition: frame.style.transition };
		frame.style.background = frameBg;
		frame.style.transition = 'background 0.25s ease';
		const prevNumeral = numeral
			? { font: numeral.style.fontFamily, color: numeral.style.color, shadow: numeral.style.textShadow }
			: null;
		if (numeral) {
			numeral.style.fontFamily = font.css;
			numeral.style.color = roles.text;
			numeral.style.textShadow = 'none';
		}
		// Full reset on unmount: whatever screen follows (question, interlude,
		// result) must see a completely untouched frame.
		return () => {
			frame.style.background = prev.bg;
			frame.style.transition = prev.transition;
			if (numeral && prevNumeral) {
				numeral.style.fontFamily = prevNumeral.font;
				numeral.style.color = prevNumeral.color;
				numeral.style.textShadow = prevNumeral.shadow;
			}
		};
	});

	// The "go crazy" emoji overlay must cover the ENTIRE question card, but the
	// frame element belongs to the page — so we render the overlay here and
	// re-parent it onto the frame while it exists.
	/** @type {HTMLElement | null} */
	let rainHost = $state(null);
	$effect(() => {
		const frame = /** @type {HTMLElement | null} */ (document.querySelector('.frame'));
		if (!frame || !rainHost) return;
		const host = rainHost;
		frame.appendChild(host);
		// Explicitly remove on teardown — the node was re-parented outside this
		// component's tree, so don't rely on framework teardown to find it.
		return () => host.remove();
	});

	/** @type {number | null} */
	let picked = $state(null);

	/** @param {number} i */
	function choose(i) {
		picked = i;
		setTimeout(() => onAnswer({ maker: i }), 340);
	}
</script>

{#if wallpaper === 'crazy'}
	<div class="rain-host" bind:this={rainHost}>
		<EmojiFloat emojis={EMOJIS} />
	</div>
{/if}

<div
	class="q20"
	style="--q-bg:{roles.bg}; --q-text:{roles.text}; --q-accent:{roles.accent}; --q-btn-text:{btnText}; --q-font:{font.css};"
>
	<h2>{prompt}</h2>
	<div class="likert">
		{#each LIKERT as label, i}
			<button
				class="btn {variant}"
				class:dim={picked !== null && picked !== i}
				disabled={picked !== null}
				onclick={() => choose(i)}
			>
				{label}
			</button>
		{/each}
	</div>
</div>

{#if import.meta.env.DEV}
	<aside class="debug">
		<p class="debug-title">🛠 debug · dev only</p>
		<label>
			Font
			<select bind:value={fontOverride}>
				<option value="">↳ from Q16 answer</option>
				{#each FONTS as f}<option value={f.id}>{f.label}</option>{/each}
			</select>
		</label>
		<label>
			Palette
			<select bind:value={paletteOverride}>
				<option value="">↳ from Q17 answer</option>
				{#each PALETTES as p}<option value={p.id}>{p.label}</option>{/each}
			</select>
		</label>
		<label>
			Button
			<select bind:value={variantOverride}>
				<option value="">↳ from Q18 answer</option>
				{#each BUTTON_VARIANTS as v}<option value={v.id}>{v.label}</option>{/each}
			</select>
		</label>
		<label>
			Wallpaper
			<select bind:value={wallpaperOverride}>
				<option value="">↳ from Q19 answer</option>
				{#each WALLPAPERS as w}<option value={w.id}>{w.label}</option>{/each}
			</select>
		</label>
	</aside>
{/if}

<style>
	/* Re-parented onto the .frame element (see $effect) so the emoji field
	   spans the entire question card, № badge and all. */
	.rain-host {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}
	.q20 {
		/* The paper frame itself carries the palette background + wallpaper (see
		   $effect); this block stays transparent so the card reads as one surface. */
		position: relative;
		z-index: 1;
		background: transparent;
		color: var(--q-text);
		font-family: var(--q-font);
		padding: 1rem 0;
		transition: color 0.25s ease;
	}
	.q20 h2 {
		position: relative;
		z-index: 1;
		margin: 0 0 2rem;
		font-size: 1.85rem;
		line-height: 1.25;
		font-family: var(--q-font);
	}
	.likert {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
	}

	/* The "go crazy" wallpaper is rendered by the shared EmojiFloat overlay. */

	.btn {
		font-family: var(--q-font);
		font-weight: 600;
		font-size: 1rem;
		padding: 0.8rem 1.4rem;
		background: var(--q-accent);
		color: var(--q-btn-text);
		cursor: pointer;
		transition:
			transform 0.12s ease,
			opacity 0.2s ease;
	}
	.btn:not(:disabled):hover {
		transform: translateY(-2px);
	}
	.btn.dim {
		opacity: 0.4;
	}
	.btn:disabled {
		cursor: default;
	}

	/* Variants mirror Q18, but colored by the chosen palette instead of app tokens. */
	.btn.simple {
		border: none;
		border-radius: 8px;
	}
	.btn.shadow {
		border: none;
		border-radius: 6px;
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.16),
			0 1px 3px rgba(0, 0, 0, 0.12);
	}
	.btn.bold {
		border: 3px solid var(--q-text);
		border-radius: 6px;
		box-shadow: 5px 5px 0 0 var(--q-text);
	}
	.btn.bold:not(:disabled):hover {
		transform: translate(2px, 2px);
		box-shadow: 3px 3px 0 0 var(--q-text);
	}
	.btn.bubbly {
		border: 1px solid var(--q-text);
		border-radius: 999px;
		padding: 0.8rem 1.7rem;
	}

	/* Debug sidebar — intentionally un-themed so it stays readable over any palette. */
	.debug {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 12rem;
		padding: 0.9rem;
		background: #ffffff;
		color: #111111;
		border: 1px solid #d4d4d4;
		border-radius: 0.6rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		font-family: system-ui, sans-serif;
		font-size: 0.8rem;
	}
	.debug-title {
		margin: 0;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #666;
	}
	.debug label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 600;
	}
	.debug select {
		font: inherit;
		font-weight: 400;
		padding: 0.35rem;
		border: 1px solid #ccc;
		border-radius: 0.4rem;
		background: #fff;
		color: #111;
	}
</style>
