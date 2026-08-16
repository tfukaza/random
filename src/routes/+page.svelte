<script>
	// The site's front matter: a running index of experiments. Append here and
	// the shelf grows a row — numbering and rules take care of themselves.
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
				'Falling blocks, except every piece is a letter of kimeiga’s kaiski typeface and every level is one of his essays, set one character at a time.'
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
</svelte:head>

<main>
	<header class="masthead">
		<p class="kicker">An index of</p>
		<h1>Assorted Experiments</h1>
		<hr class="rule rule--scotch" />
		<p class="lede">
			Small things built for no particular reason, shelved here in the order they appeared.
		</p>
	</header>

	<section class="shelf" aria-label="Experiments">
		{#each experiments as experiment, index (experiment.href)}
			<a class="entry" href={experiment.href} style="animation-delay: {120 + index * 90}ms">
				<span class="entry-no">No. {index + 1}</span>
				<span class="entry-body">
					<span class="entry-title">{experiment.title}</span>
					<span class="entry-blurb">{experiment.blurb}</span>
				</span>
				<span class="entry-kind">{experiment.kind}</span>
			</a>
		{/each}
	</section>

	<footer>
		<hr class="rule" />
		<p class="colophon">Further entries as they occur.</p>
	</footer>
</main>

<style>
	main {
		max-width: var(--maxw);
		margin: 0 auto;
		padding: clamp(3rem, 10vh, 6rem) 1.25rem 4rem;
	}

	.masthead {
		animation: rise 0.6s ease both;
	}

	.kicker {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--muted);
	}

	h1 {
		margin: 0 0 1rem;
		font-size: clamp(2.1rem, 6vw, 3rem);
		line-height: 1.05;
	}

	.lede {
		margin: 1rem 0 0;
		color: var(--muted);
		font-style: italic;
	}

	.shelf {
		margin-top: 2.5rem;
		display: flex;
		flex-direction: column;
	}

	.entry {
		display: grid;
		grid-template-columns: 4rem 1fr auto;
		gap: 1rem;
		align-items: baseline;
		padding: 1.35rem 0.5rem;
		border-top: 1px solid var(--rule);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
		text-decoration: none;
		color: inherit;
		animation: rise 0.6s ease both;
		transition: background 160ms ease;
	}

	.entry:last-child {
		border-bottom: 1px solid var(--rule);
	}

	.entry:hover,
	.entry:focus-visible {
		background: var(--accent-soft);
	}

	.entry:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.entry-no {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.entry-body {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.entry-title {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.35rem;
		line-height: 1.2;
		text-wrap: balance;
	}

	.entry:hover .entry-title,
	.entry:focus-visible .entry-title {
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
	}

	.entry-blurb {
		font-size: 0.92rem;
		color: var(--muted);
		text-wrap: pretty;
	}

	.entry-kind {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--muted);
	}

	footer {
		margin-top: 3rem;
		animation: rise 0.6s ease both;
		animation-delay: 360ms;
	}

	.colophon {
		margin: 0.8rem 0 0;
		font-size: 0.8rem;
		font-style: italic;
		color: var(--muted);
		text-align: center;
	}

	@media (max-width: 480px) {
		.entry {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}

		.entry-kind {
			order: -1;
		}
	}
</style>
