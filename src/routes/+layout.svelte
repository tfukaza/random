<script>
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/cover/botanical-personality-mark.png" />
	<link rel="apple-touch-icon" href="/images/cover/botanical-personality-mark.png" />
	<title>The Standardized Evaluation of Emotional Disposition</title>
	<meta
		name="description"
		content="A handful of very different questions. No wrong answers—just go with your gut."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://random-tau-two.vercel.app/" />
	<meta property="og:title" content="The Standardized Evaluation of Emotional Disposition" />
	<meta
		property="og:description"
		content="A handful of very different questions. No wrong answers—just go with your gut."
	/>
	<meta
		property="og:image"
		content="https://random-tau-two.vercel.app/images/social/personality-quiz-card.jpg"
	/>
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="A Victorian botanical engraving surrounding the title of the personality quiz."
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="The Standardized Evaluation of Emotional Disposition" />
	<meta
		name="twitter:description"
		content="A handful of very different questions. No wrong answers—just go with your gut."
	/>
	<meta
		name="twitter:image"
		content="https://random-tau-two.vercel.app/images/social/personality-quiz-card.jpg"
	/>
</svelte:head>

{@render children()}
