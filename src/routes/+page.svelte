<script>
	// The site's front matter: an unordered index of experiments. Append here
	// and the grid grows a cell.
	const experiments = [
		{
			href: '/quiz',
			title: 'The Standardized Evaluation of Emotional Disposition',
			kind: 'Instrument',
			blurb:
				'A personality assessment of considerable length and questionable rigor. No wrong answers—just go with your gut.'
		},
		{
			href: '/tetris',
			title: 'kaiski tetris',
			kind: 'Game',
			blurb:
				'Falling blocks, except every piece is a letter of a pixel typeface and every level is an essay, set one character at a time.'
		}
	];
</script>

<svelte:head>
	<title>Assorted Experiments</title>
	<meta
		name="description"
		content="An index of small experiments and websites: a personality instrument, a typographic tetris, and whatever comes next."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://random-tau-two.vercel.app/" />
	<meta property="og:title" content="Assorted Experiments" />
	<meta
		property="og:description"
		content="An index of small experiments and websites: a personality instrument, a typographic tetris, and whatever comes next."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Geist:wght@100..900&family=DotGothic16&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="stage">
	<div class="rails" aria-hidden="true"></div>

	<header class="site-header">
		<div class="shell header-shell">
			<span class="brand">Assorted Experiments</span>
			<span class="header-count">{experiments.length} entries</span>
		</div>
	</header>

	<main>
		<section class="shell hero" aria-labelledby="page-title">
			<div class="hero-copy">
				<h1 id="page-title">Small things, built for no particular reason.</h1>
				<p class="lede">An index of experiments and other websites, in no particular order.</p>
			</div>
			<div class="hero-panel" aria-hidden="true"></div>
		</section>

		<section class="shell section" aria-labelledby="experiments-title">
			<h2 id="experiments-title" class="section-title">Experiments</h2>
			<div class="grid">
				{#each experiments as experiment (experiment.href)}
					<a class="card" href={experiment.href}>
						<div class="card-head">
							<span class="card-kind">{experiment.kind}</span>
						</div>
						<h3>{experiment.title}</h3>
						<p class="card-copy">{experiment.blurb}</p>
					</a>
				{/each}
				<div class="card card-empty" aria-hidden="true"></div>
			</div>
		</section>
	</main>

	<footer class="site-footer">
		<div class="shell footer-shell">
			<span class="footer-note">Further entries as they occur.</span>
		</div>
	</footer>
</div>

<style>
	/* Neutral grammar borrowed from kimu.rec: near-monochrome greys, hairline
	   borders collapsed with -1px margins, zero radii, zero shadows, pixel
	   type for structure and Geist for small grey meta copy. */
	.stage {
		--n-bg: #f7f7f7;
		--n-panel: #efefef;
		--n-panel-deep: #ebebeb;
		--n-text: #111111;
		--n-muted: #6f6f6f;
		--n-body: #4f4f4f;
		--n-line: #dcdcdc;
		--n-line-strong: #cfcfcf;
		--n-dash: #d2d2d2;
		--jp: 'DotGothic16';
		--pixel: 'Pixelify Sans', var(--jp), ui-monospace, monospace;
		--sans: 'Geist', var(--jp), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
		--shell: 1080px;
		--shell-pad: 24px;
		--gap-section: clamp(72px, 10vw, 150px);

		position: relative;
		min-height: 100dvh;
		background: var(--n-bg);
		color: var(--n-text);
		font-family: var(--pixel);
		display: flex;
		flex-direction: column;
	}

	.rails {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		z-index: 0;
		width: min(var(--shell), calc(100% - var(--shell-pad) * 2));
		border-left: 1px dashed var(--n-dash);
		border-right: 1px dashed var(--n-dash);
		transform: translateX(-50%);
		pointer-events: none;
	}

	.shell {
		position: relative;
		z-index: 1;
		width: min(var(--shell), calc(100% - var(--shell-pad) * 2));
		margin: 0 auto;
	}

	.site-header {
		background: var(--n-bg);
		border-bottom: 1px solid var(--n-line-strong);
	}

	.header-shell {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		min-height: 64px;
	}

	.brand {
		font-size: clamp(1.25rem, 2vw, 1.6rem);
		font-weight: 400;
		line-height: 1;
	}

	.header-count {
		font-family: var(--sans);
		font-size: 0.9rem;
		color: var(--n-muted);
	}

	main {
		flex: 1;
	}

	.hero {
		margin-top: clamp(40px, 6vw, 80px);
		display: grid;
		grid-template-columns: minmax(0, 1fr) 35%;
		align-items: stretch;
		min-height: clamp(300px, 36vw, 480px);
		border: 1px solid var(--n-line);
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 18px;
		padding: clamp(28px, 5vw, 72px);
	}

	h1 {
		margin: 0;
		max-width: 14ch;
		font-family: var(--pixel);
		font-size: clamp(2rem, 5.4vw, 4.25rem);
		font-weight: 400;
		line-height: 1.04;
		letter-spacing: 0.01em;
		text-shadow: none;
	}

	.lede {
		margin: 0;
		font-family: var(--sans);
		font-size: 0.95rem;
		line-height: 1.9;
		color: var(--n-muted);
	}

	.hero-panel {
		background: var(--n-panel);
		border-left: 1px solid var(--n-line);
	}

	.section {
		margin-top: var(--gap-section);
		margin-bottom: var(--gap-section);
	}

	.section-title {
		margin: 0 0 clamp(28px, 4vw, 48px);
		font-family: var(--pixel);
		font-size: clamp(0.95rem, 1.3vw, 1.1rem);
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--n-muted);
		text-shadow: none;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
	}

	@media (min-width: 700px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 300px;
		padding: 22px 24px;
		background: var(--n-panel);
		border: 1px solid var(--n-line-strong);
		margin: 0 -1px -1px 0;
		color: inherit;
		text-decoration: none;
		transition: background 120ms ease;
	}

	a.card:hover,
	a.card:focus-visible {
		background: var(--n-panel-deep);
	}

	a.card:focus-visible {
		outline: 1px solid var(--n-text);
		outline-offset: -4px;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.9rem;
		color: var(--n-muted);
	}

	.card h3 {
		margin: 0;
		font-family: var(--pixel);
		font-size: clamp(1.2rem, 1.9vw, 1.6rem);
		font-weight: 400;
		line-height: 1.15;
		letter-spacing: 0.01em;
		text-shadow: none;
		text-wrap: balance;
	}

	.card-copy {
		margin: auto 0 0;
		font-family: var(--sans);
		font-size: 0.9rem;
		line-height: 1.7;
		color: var(--n-body);
	}

	.card-empty {
		min-height: 0;
	}

	@media (max-width: 699px) {
		.card-empty {
			display: none;
		}
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}
		.hero-panel {
			display: none;
		}
	}

	.site-footer {
		border-top: 1px solid var(--n-line);
		padding: clamp(28px, 4vw, 48px) 0;
	}

	.footer-shell {
		display: flex;
		justify-content: space-between;
		gap: 32px;
	}

	.footer-note {
		font-family: var(--sans);
		font-size: 0.9rem;
		color: var(--n-muted);
	}
</style>
