<script>
	// A fake restaurant coupon, drawn once and reused: shown in expired-coupon as
	// the thing you are deciding whether to fight over, and — if you put it away
	// unused — peeking out from under the paper stack in CouponSlip. All ink is
	// `currentColor`, so it themes with the page like every other line drawing;
	// the one exception is the EXPIRED stamp, which is a faded oxblood so it reads
	// as a rubber stamp rather than part of the print.
	let { stamped = true } = $props();
</script>

<svg class="coupon" viewBox="0 0 300 132" role="img" aria-label="A restaurant discount coupon, expired.">
	<!-- ticket body -->
	<rect
		x="3"
		y="3"
		width="294"
		height="126"
		rx="9"
		fill="var(--surface)"
		stroke="currentColor"
		stroke-width="1.6"
		stroke-dasharray="7 4"
	/>
	<!-- tear-off stub, on a dashed perforation with little scissors -->
	<line x1="84" y1="12" x2="84" y2="120" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 4" opacity="0.65" />
	<g transform="translate(84 8)" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.65">
		<circle cx="-4" cy="-2" r="2.3" />
		<circle cx="4" cy="-2" r="2.3" />
		<path d="M-3 0 L6 8 M3 0 L-6 8" />
	</g>
	<text transform="translate(32 112) rotate(-90)" font-size="10.5" letter-spacing="3" fill="currentColor" opacity="0.7">DINE-IN ONLY</text>

	<!-- main copy -->
	<text x="102" y="33" font-size="10.5" letter-spacing="2.4" fill="currentColor" opacity="0.78">THE BLUE FORK · BISTRO</text>
	<text x="101" y="79" font-size="37" font-weight="800" fill="currentColor">20% OFF</text>
	<text x="103" y="99" font-size="10.5" letter-spacing="0.6" fill="currentColor" opacity="0.78">your total bill, one visit</text>
	<text x="103" y="119" font-size="9.5" letter-spacing="1.4" fill="currentColor" opacity="0.6">EXPIRES · yesterday</text>

	{#if stamped}
		<!-- the rubber stamp — slightly askew, faded, over the offer -->
		<g class="stamp" transform="rotate(-11 205 64)">
			<rect x="128" y="45" width="154" height="38" rx="5" fill="none" stroke-width="3" />
			<text x="205" y="72" font-size="27" font-weight="800" letter-spacing="4" text-anchor="middle">EXPIRED</text>
		</g>
	{/if}
</svg>

<style>
	.coupon {
		width: 100%;
		height: auto;
		display: block;
		color: var(--ink);
	}
	/* A stamp, not part of the printed coupon: a faded oxblood, and drawn with
	   its own colour so it survives the currentColor theming around it. */
	.stamp {
		fill: #9a3b32;
		stroke: #9a3b32;
		opacity: 0.62;
	}
</style>
