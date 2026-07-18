<script>
	// Shared "go crazy" wallpaper overlay: a confetti/balloon field of emojis
	// drifting upward. Every emoji gets `perEmoji` concurrent instances, each
	// with its own randomized lane, speed, phase, wobble amplitude, scale pulse,
	// and tilt — so the field never looks looped. Fills its nearest positioned
	// ancestor; pointer-events pass through.
	let { emojis, perEmoji = 8, size = '1.3rem' } = $props();

	// One-time layout roll on mount — each mount deals a fresh random field.
	// svelte-ignore state_referenced_locally
	const items = emojis.flatMap((/** @type {string} */ emoji) =>
		Array.from({ length: perEmoji }, () => ({
			emoji,
			x: Math.random() * 100, // horizontal lane, %
			dur: 4 + Math.random() * 5, // rise duration, s
			del: -(Math.random() * 9), // negative delay → starts mid-flight
			wdur: 1.4 + Math.random() * 1.8, // wobble period, s
			wdel: -(Math.random() * 3),
			amp: (0.4 + Math.random() * 1.1).toFixed(2), // wobble amplitude, rem
			smin: (0.65 + Math.random() * 0.2).toFixed(2), // scale pulse range
			smax: (1.05 + Math.random() * 0.35).toFixed(2),
			rot: (Math.random() * 24 - 12).toFixed(1) // tilt, deg
		}))
	);
</script>

<div class="float-field" aria-hidden="true">
	{#each items as it}
		<span
			class="fly"
			style="left: {it.x}%; font-size: {size}; --dur: {it.dur}s; --del: {it.del}s;"
		>
			<span
				class="wob"
				style="--wdur: {it.wdur}s; --wdel: {it.wdel}s; --amp: {it.amp}rem; --smin: {it.smin}; --smax: {it.smax}; --rot: {it.rot}deg;"
				>{it.emoji}</span
			>
		</span>
	{/each}
</div>

<style>
	.float-field {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}
	/* Outer span rises; inner span wobbles/pulses. Two elements because both
	   effects want the transform property. */
	.fly {
		position: absolute;
		top: 108%;
		animation: rise var(--dur) linear var(--del) infinite;
	}
	@keyframes rise {
		to {
			top: -12%;
		}
	}
	.wob {
		display: inline-block;
		animation: wobble var(--wdur) ease-in-out var(--wdel) infinite alternate;
	}
	@keyframes wobble {
		from {
			transform: translateX(calc(var(--amp) * -1)) rotate(calc(var(--rot) * -1))
				scale(var(--smin));
		}
		to {
			transform: translateX(var(--amp)) rotate(var(--rot)) scale(var(--smax));
		}
	}
</style>
