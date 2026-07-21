<script>
	import { releases } from '$lib/releases.js';
</script>

<svelte:head>
	<title>Release notes — The Standardized Evaluation of Emotional Disposition</title>
	<meta
		name="description"
		content="What has changed in The Standardized Evaluation of Emotional Disposition, from the first release onward."
	/>
</svelte:head>

<main>
	<div class="paper-stack">
		<span class="sheet sheet--under" aria-hidden="true"></span>
		<span class="sheet sheet--deep" aria-hidden="true"></span>
		<section class="page">
			<span class="corner corner--tl" aria-hidden="true"></span>
			<span class="corner corner--tr" aria-hidden="true"></span>
			<span class="corner corner--bl" aria-hidden="true"></span>
			<span class="corner corner--br" aria-hidden="true"></span>

			<nav aria-label="Breadcrumb">
				<a href="/">← Return to the quiz</a>
			</nav>

			<header>
				<p class="kicker">Amendments &amp; corrections</p>
				<hr class="rule rule--scotch" />
				<h1>Release notes</h1>
				<p class="lede">A record of new questions, repaired machinery, and other changes to the instrument.</p>
			</header>

			<div class="releases">
				{#each releases as release, index (release.version)}
					<article class:latest={index === 0}>
						<div class="release-heading">
							<div>
								<p class="version">Version {release.version}</p>
								<h2>{release.label}</h2>
							</div>
							<div class="release-meta">
								{#if index === 0}<span class="current">Current</span>{/if}
								<time datetime={release.dateIso}>{release.date}</time>
							</div>
						</div>
						<p class="summary">{release.summary}</p>

						{#each release.sections as section}
							<section class="notes">
								<h3>{section.title}</h3>
								<ul>
									{#each section.items as item}
										<li>{item}</li>
									{/each}
								</ul>
							</section>
						{/each}
					</article>
				{/each}
			</div>
		</section>
	</div>
</main>

<style>
	main {
		display: flex;
		justify-content: center;
		padding: clamp(1.5rem, 5vw, 4rem) 1.25rem 5rem;
		overflow-x: clip;
	}

	.paper-stack {
		position: relative;
		width: min(100%, 720px);
	}

	.sheet {
		position: absolute;
		inset: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 5%);
	}

	.sheet--under {
		transform: rotate(0.55deg);
	}

	.sheet--deep {
		transform: rotate(-0.4deg);
	}

	.page {
		position: relative;
		padding: clamp(1.75rem, 6vw, 4.25rem);
		background: var(--surface);
		border: 1px solid var(--rule);
		box-shadow:
			0 0.125rem 0.25rem rgb(0 0 0 / 5%),
			0 1.5rem 2.5rem rgb(0 0 0 / 5%);
	}

	.page::before {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid var(--border);
		pointer-events: none;
	}

	.corner {
		position: absolute;
		z-index: 1;
		width: 7px;
		height: 7px;
		background: var(--rule);
		transform: rotate(45deg);
	}

	.corner--tl { top: 1px; left: 1px; }
	.corner--tr { top: 1px; right: 1px; }
	.corner--bl { bottom: 1px; left: 1px; }
	.corner--br { right: 1px; bottom: 1px; }

	nav,
	header,
	.releases {
		position: relative;
	}

	nav {
		margin-bottom: clamp(2.5rem, 7vw, 4.5rem);
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	a {
		color: var(--muted);
		text-decoration-color: var(--rule);
		text-underline-offset: 0.25em;
	}

	a:hover {
		color: var(--ink);
	}

	.kicker,
	.version,
	.notes h3 {
		font-family: 'IBM Plex Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.14em;
	}

	.kicker {
		margin: 0 0 1rem;
		color: var(--muted);
		font-size: 0.7rem;
	}

	header .rule {
		margin-bottom: 1.75rem;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.75rem, 9vw, 4.75rem);
		line-height: 0.95;
	}

	.lede {
		max-width: 48ch;
		margin: 1.5rem 0 0;
		color: var(--muted);
		font-size: 1.05rem;
	}

	.releases {
		margin-top: clamp(3rem, 8vw, 5rem);
	}

	article {
		padding: clamp(2.25rem, 6vw, 3.5rem) 0;
		border-top: 1px solid var(--rule);
	}

	article.latest {
		border-top: 3px double var(--rule);
	}

	.release-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 2rem;
	}

	.version {
		margin: 0 0 0.5rem;
		color: var(--muted);
		font-size: 0.68rem;
	}

	h2 {
		margin: 0;
		font-size: clamp(1.8rem, 6vw, 2.5rem);
		line-height: 1.05;
	}

	.release-meta {
		display: flex;
		align-items: flex-end;
		gap: 0.55rem;
		flex-direction: column;
		color: var(--muted);
		font-size: 0.76rem;
		white-space: nowrap;
	}

	.current {
		padding: 0.15rem 0.5rem;
		border: 1px solid var(--rule);
		color: var(--ink);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.summary {
		max-width: 52ch;
		margin: 1.5rem 0 2rem;
		font-size: 1.05rem;
		font-style: italic;
	}

	.notes h3 {
		margin: 0 0 1rem;
		font-size: 0.68rem;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		position: relative;
		padding: 0.75rem 0 0.75rem 1.5rem;
		border-top: 1px solid var(--border);
	}

	li::before {
		content: '✦';
		position: absolute;
		top: 0.87rem;
		left: 0.1rem;
		color: var(--muted);
		font-size: 0.62rem;
	}

	@media (max-width: 520px) {
		.release-heading {
			flex-direction: column;
			gap: 0.8rem;
		}

		.release-meta {
			align-items: center;
			flex-direction: row;
		}
	}
</style>
