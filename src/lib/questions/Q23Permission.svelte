<script>
	// Q23 — the question IS the browser's geolocation permission dialog.
	// The prompt fires automatically ~1s after the heading finishes animating
	// in (so the native popup never covers moving text), and whichever button
	// the user presses in the browser UI is the answer. The position itself is
	// discarded unread — only the allow/deny choice matters.
	import { onMount } from 'svelte';
	import SplitText from '$lib/SplitText.svelte';
	import { textMs } from '$lib/reveal.js';
	import { playSfx } from '$lib/audio/audio.svelte.js';

	let { onAnswer } = $props();

	const HEADING = 'Can you give me permission?';

	/** @type {'waiting' | 'asking' | 'allowed' | 'denied' | 'unsupported'} */
	let status = $state('waiting');
	let done = false;

	/**
	 * @param {Record<string, number>} score
	 * @param {'allowed' | 'denied' | 'unsupported'} verdict
	 */
	function finish(score, verdict) {
		if (done) return;
		done = true;
		status = verdict;
		void playSfx('ui-confirm', { rate: verdict === 'denied' ? 0.88 : 1 });
		setTimeout(() => onAnswer(score), 1000);
	}

	function request() {
		status = 'asking';
		if (!('geolocation' in navigator)) {
			finish({}, 'unsupported');
			return;
		}
		navigator.geolocation.getCurrentPosition(
			// granted — the coordinates are thrown away
			() => finish({ risk: 2, social: 1 }, 'allowed'),
			(err) => {
				if (err.code === err.PERMISSION_DENIED)
					finish({ risk: -2, scope: -1 }, 'denied');
				// granted but no fix (timeout/unavailable) still means they said yes
				else finish({ risk: 2, social: 1 }, 'allowed');
			},
			{ timeout: 8000, maximumAge: Infinity }
		);
	}

	onMount(() => {
		// heading animation (~1.2s incl. settle + letter stagger) + 1s of calm
		// Derived, not hardcoded: the heading has to finish arriving before the
		// native dialog covers it, and word-reveal timing changes with the text.
		const t = setTimeout(request, textMs(HEADING) + 1000);
		return () => clearTimeout(t);
	});
</script>

<div class="permission">
	<h2><SplitText text={HEADING} /></h2>
	<hr class="rule" />

	<p class="status" class:visible={status !== 'waiting'}>
		{#if status === 'asking'}
			The browser would like to know.
		{:else if status === 'allowed'}
			Generous of you.
		{:else if status === 'denied'}
			Duly noted.
		{:else if status === 'unsupported'}
			Your browser abstained on your behalf.
		{/if}
	</p>
</div>

<style>
	h2 {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
	}
	.permission > hr {
		margin: 0 0 1.75rem;
		animation: draw 0.5s 0.15s both;
	}
	.status {
		min-height: 4rem;
		font-style: italic;
		color: var(--muted);
		opacity: 0;
		transition: opacity 0.4s ease;
		margin: 0;
	}
	.status.visible {
		opacity: 1;
	}
</style>
