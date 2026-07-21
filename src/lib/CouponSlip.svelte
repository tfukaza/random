<script>
	// The coupon you decided NOT to use, tucked under the stack of paper — its
	// corner poking out from beneath the card for the rest of the run, the way the
	// paint pool does. Mounted as a child of `.stage`, BEFORE `.frame`, so the
	// opaque card covers all but the edge that sticks past its bottom corner.
	//
	// Like PaintPool it lives outside the {#key index} block, so it does not
	// remount per question and its slide-in plays exactly once.
	import Coupon from './Coupon.svelte';
</script>

<div class="coupon-slip" aria-hidden="true">
	<Coupon />
</div>

<style>
	/* Poking out past the bottom-left corner of the stack. Most of the coupon
	   sits behind the opaque .frame (which comes later in the DOM and paints over
	   it); only the corner below the card's edge shows — which is what sells
	   "it's still under there, unused". */
	.coupon-slip {
		position: absolute;
		left: 4%;
		bottom: -1.4rem;
		width: 42%;
		max-width: 14rem;
		transform: rotate(-7deg);
		transform-origin: bottom left;
		filter: drop-shadow(0 0.35rem 0.4rem rgba(0, 0, 0, 0.16));
		pointer-events: none;
		animation: slip-in 0.85s cubic-bezier(0.18, 0.82, 0.3, 1) both;
	}
	@keyframes slip-in {
		from {
			transform: rotate(-7deg) translate(0.6rem, -2.4rem);
			opacity: 0;
		}
		to {
			transform: rotate(-7deg) translate(0, 0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.coupon-slip {
			animation: none;
		}
	}
</style>
