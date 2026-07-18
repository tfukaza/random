<script>
	// Letter-by-letter text reveal. Words are kept as inline-blocks so the
	// browser still wraps at word boundaries, never mid-word.
	let { text, delay = 0, stagger = 30 } = $props();

	const words = $derived.by(() => {
		let idx = 0;
		return text
			.split(' ')
			.map((word) => word.split('').map((ch) => ({ ch, idx: idx++ })));
	});
</script>

<span class="split" aria-label={text}>
	{#each words as letters, wi}
		{#if wi > 0}{' '}{/if}
		<span class="word" aria-hidden="true">
			{#each letters as { ch, idx } (idx)}
				<span class="letter" style="animation-delay: {delay + idx * stagger}ms">{ch}</span>
			{/each}
		</span>
	{/each}
</span>

<style>
	.word {
		display: inline-block;
	}
	.letter {
		display: inline-block;
		animation: letter-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes letter-in {
		from {
			opacity: 0;
			transform: translateY(0.35em);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
