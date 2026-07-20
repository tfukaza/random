<script>
	/** @type {{
	 *   disabled?: boolean,
	 *   committed?: boolean,
	 *   label?: string,
	 *   committedLabel?: string,
	 *   delay?: number,
	 *   margin?: string,
	 *   className?: string,
	 *   onsubmit: () => void
	 * }} */
	let {
		disabled = false,
		committed = false,
		label = 'Submit answer →',
		committedLabel = 'Submitted',
		delay = 0,
		margin = '2rem 0 0 auto',
		className = '',
		onsubmit
	} = $props();

	function submit() {
		if (disabled || committed) return;
		onsubmit();
	}
</script>

<button
	type="button"
	class="submit-answer next {className}"
	data-answer-submit
	data-sfx="ui-confirm"
	disabled={disabled || committed}
	style="animation-delay: {delay}ms; margin: {margin}"
	onclick={submit}
>
	{committed ? committedLabel : label}
</button>

<style>
	.submit-answer {
		animation: rise 0.42s both;
		display: block;
		padding: 0.75rem 1.5rem;
		background: var(--ink);
		color: var(--bg);
		border: none;
		border-radius: var(--radius);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s ease,
			opacity 0.2s ease;
	}
	.submit-answer:hover:not(:disabled) {
		background: #0f0f0f;
	}
	.submit-answer:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>
