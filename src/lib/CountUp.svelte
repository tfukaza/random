<script>
	// Counts from 0 up to `value` with an ease-out, starting after `delay` ms.
	let { value, delay = 0, duration = 700 } = $props();

	let shown = $state(0);

	$effect(() => {
		/** @type {number | undefined} */
		let raf;
		/** @type {number | undefined} */
		let start;
		const target = value;
		/** @param {number} now */
		const tick = (now) => {
			if (start === undefined) start = now;
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			shown = Math.round(target * eased);
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		const timer = setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
		return () => {
			clearTimeout(timer);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

{shown}
