<script>
	import { onMount } from 'svelte';
	import {
		beginAttempt,
		markReady,
		recordEvent,
		recordInteraction,
		recordSubmitAttempt,
		recordVisibility
	} from '$lib/questions/metrics.svelte.js';

	/** @type {{ id: string, qNumber: number, delivery?: string, children: import('svelte').Snippet }} */
	let { id, qNumber, delivery = 'normal', children } = $props();
	/** @type {HTMLDivElement | undefined} */
	let host;
	/** @type {Map<Element, number>} */
	const dwell = new Map();

	// Establish the attempt before child effects (notably PatienceLens) can
	// report readiness. onMount runs child-first and would attribute a fast
	// reader's events to the question that just finished.
	// svelte-ignore state_referenced_locally
	if (typeof window !== 'undefined') beginAttempt(id, qNumber, delivery);

	function answerTarget(/** @type {EventTarget | null} */ target) {
		return target instanceof Element
			? target.closest('[data-answer-id], button, input, [role="slider"]')
			: null;
	}

	function pointerDown(/** @type {PointerEvent} */ event) {
		if (!answerTarget(event.target)) return;
		recordInteraction(event.pointerType || 'pointer');
	}

	function keyDown(/** @type {KeyboardEvent} */ event) {
		if (!answerTarget(event.target)) return;
		if (['Tab', 'Shift', 'Alt', 'Control', 'Meta'].includes(event.key)) return;
		recordInteraction('keyboard');
	}

	function clickCapture(/** @type {MouseEvent} */ event) {
		const target = answerTarget(event.target);
		if (!(target instanceof Element)) return;
		// Capture runs before the component handler, which matters when that
		// handler synchronously advances and unmounts this question.
		if (target.matches('[data-answer-submit], button.next, button.submit')) {
			recordSubmitAttempt();
		}
	}

	function focusIn(/** @type {FocusEvent} */ event) {
		const target = answerTarget(event.target);
		if (!target) return;
		dwell.set(target, performance.now());
		recordEvent('focus-start', { control: target.getAttribute('data-answer-id') ?? target.getAttribute('aria-label') ?? target.tagName.toLowerCase() });
	}

	function focusOut(/** @type {FocusEvent} */ event) {
		const target = answerTarget(event.target);
		if (!target) return;
		const started = dwell.get(target);
		dwell.delete(target);
		recordEvent('focus-end', {
			control: target.getAttribute('data-answer-id') ?? target.getAttribute('aria-label') ?? target.tagName.toLowerCase(),
			dwellMs: started === undefined ? 0 : Math.max(0, performance.now() - started)
		});
	}

	onMount(() => {
		const visibility = () => recordVisibility(document.hidden);
		document.addEventListener('visibilitychange', visibility);
		document.addEventListener('click', clickCapture, { capture: true });
		requestAnimationFrame(() => {
			if (delivery === 'normal') markReady('paint');
		});
		return () => {
			document.removeEventListener('visibilitychange', visibility);
			document.removeEventListener('click', clickCapture, { capture: true });
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="question-runtime"
	bind:this={host}
	onpointerdown={pointerDown}
	onkeydown={keyDown}
	onfocusin={focusIn}
	onfocusout={focusOut}
>
	{@render children()}
</div>

<style>
	.question-runtime {
		width: 100%;
	}
</style>
