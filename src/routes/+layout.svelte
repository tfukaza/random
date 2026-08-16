<script>
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/cover/botanical-personality-mark.png" />
	<link rel="apple-touch-icon" href="/images/cover/botanical-personality-mark.png" />
</svelte:head>

{@render children()}
