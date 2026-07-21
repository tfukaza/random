<script>
	import { retiredQuestions } from '$lib/retiredQuestions.js';
</script>

<svelte:head>
	<title>Retired questions — The Standardized Evaluation of Emotional Disposition</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="description" content="An archive of questions retired from the personality quiz." />
</svelte:head>

<main>
	<section class="page">
		<header>
			<p class="kicker">Restricted stacks · {retiredQuestions.length} records</p>
			<h1>The gallery of retired questions</h1>
			<p class="lede">They are out of the quiz, but not erased. Each card records what the question asked and why it was put away.</p>
		</header>

		<div class="gallery">
			{#each retiredQuestions as question, index (question.id)}
				<article style={`--tilt: ${(index % 5) * 0.18 - 0.36}deg`}>
					<div class="record-head">
						<span class="number">{String(index + 1).padStart(2, '0')}</span>
						<span class="stamp">Retired</span>
					</div>
					<p class="id">{question.id}</p>
					{#if question.formerNumber}<p class="former">Formerly Question {question.formerNumber}</p>{/if}
					<h2>{question.prompt}</h2>
					<p class="concept">{question.concept}</p>
					<hr />
					<h3>Why it left</h3>
					<p class="reason">{question.reason}</p>
					{#if question.preserved}<p class="preserved">Source preserved</p>{/if}
				</article>
			{/each}
		</div>
	</section>
</main>

<style>
	main {
		min-height: 100vh;
		padding: clamp(2rem, 6vw, 5rem) 1.25rem 6rem;
	}
	.page {
		width: min(100%, 1080px);
		margin: 0 auto;
	}
	header {
		max-width: 720px;
		margin-bottom: clamp(2.5rem, 6vw, 4.5rem);
	}
	.kicker,
	.id,
	.former,
	h3,
	.preserved {
		font-family: 'IBM Plex Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.kicker {
		color: var(--muted);
		font-size: 0.7rem;
	}
	h1 {
		max-width: 12ch;
		margin: 1rem 0;
		font-size: clamp(2.7rem, 8vw, 5.8rem);
		line-height: 0.95;
	}
	.lede {
		max-width: 58ch;
		color: var(--muted);
		font-size: 1.08rem;
	}
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 285px), 1fr));
		gap: 1.5rem;
		align-items: start;
	}
	article {
		position: relative;
		padding: 1.4rem;
		background: var(--surface);
		border: 1px solid var(--rule);
		box-shadow: 0 0.65rem 1.2rem rgb(0 0 0 / 7%);
		transform: rotate(var(--tilt));
	}
	article::after {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid var(--border);
		pointer-events: none;
	}
	.record-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
	}
	.number {
		font-size: 2rem;
		font-style: italic;
		color: var(--rule);
	}
	.stamp {
		padding: 0.3rem 0.55rem;
		border: 2px solid #9d493c;
		color: #9d493c;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		transform: rotate(3deg);
	}
	.id {
		margin: 0.8rem 0 0;
		color: var(--muted);
		font-size: 0.62rem;
	}
	.former {
		margin: 0.35rem 0 0;
		color: #9d493c;
		font-size: 0.58rem;
	}
	h2 {
		margin: 0.8rem 0;
		font-size: 1.35rem;
		font-style: italic;
		line-height: 1.22;
	}
	.concept,
	.reason {
		line-height: 1.55;
	}
	.concept {
		color: var(--muted);
	}
	article hr {
		margin: 1.2rem 0;
	}
	h3 {
		margin: 0 0 0.55rem;
		font-size: 0.62rem;
	}
	.reason {
		margin: 0;
		font-size: 0.9rem;
	}
	.preserved {
		display: inline-block;
		margin: 1.1rem 0 0;
		padding-top: 0.45rem;
		border-top: 1px solid var(--rule);
		color: var(--muted);
		font-size: 0.55rem;
	}
</style>
