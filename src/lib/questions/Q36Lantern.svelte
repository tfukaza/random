<script>
	// Q36 — a purchase decision with the product page deliberately amputated.
	// Real product (LoveFrom × BALMUDA, "Sailing Lantern", $4,800.00), but the
	// taker gets only the photo, a name and a number: no description, no spec
	// sheet, no "limited edition of 1,000", no link. The joke is the acreage of
	// white space where a product page would be doing its persuading — and
	// that people will still answer confidently.
	//
	// The photo is the vendor's own product shot, saved to static/ rather than
	// hot-linked (their CDN would be a fragile dependency). It ships on a
	// uniform #DCDCDC backdrop, which would otherwise sit on the certificate as
	// an obvious grey tile. brightness(1.17) sets the white point at that 220
	// grey so the backdrop clips to pure white, and `multiply` then renders
	// pure white as the paper beneath — leaving the lantern (and its contact
	// shadow) printed directly onto the certificate, grain and all.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'Would you buy this?';
	const options = [
		// Buying a $4,800 object from a name and a number alone is a leap of
		// faith; declining is the only pragmatic move on the table.
		{ label: 'Yes', score: { risk: 3, scope: 1 } },
		{ label: 'No', score: { risk: -2, creative: -1 } }
	];
</script>

<PickList {prompt} {options} {onAnswer}>
	<!-- Styled as a museum wall label: the entire product, as presented. -->
	<div class="listing">
		<img class="lantern" src="/sailing-lantern.jpg" alt="" width="1920" height="1920" />

		<p class="name">Sailing Lantern</p>
		<p class="price">$4,800.00</p>
	</div>
</PickList>

<style>
	.listing {
		/* The whitespace is the content — resist the urge to fill it. */
		padding: 1.5rem 1rem 3rem;
		text-align: center;
		animation: rise 0.6s 0.2s both;
	}
	.lantern {
		display: block;
		width: 380px;
		max-width: 100%;
		height: auto;
		margin: -2.5rem auto -1.5rem;
		/* Knocks the grey backdrop out to paper — see note above. */
		filter: brightness(1.17);
		mix-blend-mode: multiply;
	}
	.name {
		margin: 0;
		font-family: var(--font-display, 'Cormorant Garamond', serif);
		font-size: 2.4rem;
		line-height: 1.15;
		letter-spacing: 0.01em;
		text-wrap: balance;
	}
	.price {
		margin: 1.1rem 0 0;
		font-size: 1.05rem;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
	}
	@media (max-width: 520px) {
		.listing {
			padding: 1rem 0.5rem 2.5rem;
		}
		.lantern {
			width: 290px;
			margin: -1.75rem auto -1rem;
		}
		.name {
			font-size: 1.9rem;
		}
	}
</style>
