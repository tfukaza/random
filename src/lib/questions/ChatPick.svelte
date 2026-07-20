<script>
	// Simulated iMessage group chat: incoming bubbles "type" in one by one,
	// and the only way to reply is the QuickType suggestion bar — an iPhone
	// keyboard with every key removed. Tapping a suggestion sends it as your
	// message, then commits that option's score.
	import { onMount } from 'svelte';
	import SubmitAnswer from './SubmitAnswer.svelte';
	import { recordDraft } from '$lib/questions/metrics.svelte.js';

	// `history` is optional: an already-read backlog rendered instantly and
	// scrolled to the bottom, for questions where the argument happened BEFORE
	// the taker arrived. Entries are { from: 'them' | 'you' | 'system', text }.
	// `messages` keeps its original shape (plain strings, typed in one by one)
	// so the questions that predate this prop are untouched.
	let { title, sender, messages, options, onAnswer, history = [], prompt = '' } = $props();

	// iMessage-style data detection: emails render as underlined blue links.
	const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
	/** @param {string} text */
	function segments(text) {
		const out = [];
		let last = 0;
		for (const m of text.matchAll(EMAIL_RE)) {
			if (m.index > last) out.push({ text: text.slice(last, m.index), link: false });
			out.push({ text: m[0], link: true });
			last = m.index + m[0].length;
		}
		if (last < text.length) out.push({ text: text.slice(last), link: false });
		return out;
	}

	/** @type {HTMLElement | undefined} */
	let thread = $state();
	let shown = $state(0); // incoming bubbles revealed so far
	let typing = $state(false); // typing-indicator bubble visible
	/** @type {number | null} */
	let sent = $state(null); // index of the chosen suggestion
	/** @type {number | null} */
	let picked = $state(null);
	let committed = $state(false);

	const ready = $derived(shown === messages.length && !committed);

	onMount(() => {
		// Land at the bottom of the backlog, where a real thread opens — the
		// taker scrolls UP to find out what happened.
		if (thread) thread.scrollTop = thread.scrollHeight;
		let cancelled = false;
		/** @type {ReturnType<typeof setTimeout>[]} */
		const timers = [];
		const next = () => {
			if (cancelled || shown >= messages.length) return;
			typing = true;
			timers.push(
				setTimeout(() => {
					typing = false;
					shown += 1;
					timers.push(setTimeout(next, 400));
				}, 950)
			);
		};
		timers.push(setTimeout(next, 450));
		return () => {
			cancelled = true;
			timers.forEach(clearTimeout);
		};
	});

	// Mouse drag-to-scroll for the suggestion bar (touch scrolls natively).
	/** @type {{ x: number, left: number, moved: boolean } | null} */
	let drag = null;
	let justDragged = false;

	/** @param {PointerEvent} e */
	function dragStart(e) {
		if (e.pointerType !== 'mouse') return;
		const bar = /** @type {HTMLElement} */ (e.currentTarget);
		drag = { x: e.clientX, left: bar.scrollLeft, moved: false };
	}
	/** @param {PointerEvent} e */
	function dragMove(e) {
		if (!drag) return;
		const bar = /** @type {HTMLElement} */ (e.currentTarget);
		const dx = e.clientX - drag.x;
		if (Math.abs(dx) > 4) drag.moved = true;
		bar.scrollLeft = drag.left - dx;
	}
	function dragEnd() {
		justDragged = drag?.moved ?? false;
		drag = null;
		setTimeout(() => (justDragged = false), 0);
	}

	/** @param {number} i */
	function choose(i) {
		if (justDragged || committed || shown < messages.length) return;
		picked = i;
		recordDraft({ format: 'chat-choice', value: options[i].id ?? i, label: options[i].label });
	}

	function submit() {
		const choice = picked;
		if (choice === null || committed || shown < messages.length) return;
		committed = true;
		sent = choice;
		// Let the sent bubble pop in before moving on.
		setTimeout(() => onAnswer(options[choice].score), 900);
	}
</script>

{#if prompt}
	<h2 class="chat-prompt" data-reader-text>{prompt}</h2>
{/if}
<div class="phone">
	<div class="chat-header">
		<span class="avatar" aria-hidden="true">№</span>
		<p class="chat-name">{title}</p>
	</div>
	<div class="chat" bind:this={thread}>
		<p class="sender-name">{sender}</p>
		{#each history as h}
			{#if h.from === 'system'}
				<p class="system">{h.text}</p>
			{:else}
				<div class="bubble {h.from === 'you' ? 'out' : 'in'} settled">{h.text}</div>
			{/if}
		{/each}
		{#each messages.slice(0, shown) as m}
			<div class="bubble in">
				{#each segments(m) as seg}{#if seg.link}<span class="data-link">{seg.text}</span
					>{:else}{seg.text}{/if}{/each}
			</div>
		{/each}
		{#if typing}
			<div class="bubble in typing" aria-label="typing">
				<span></span><span></span><span></span>
			</div>
		{/if}
		{#if sent !== null}
			<div class="bubble out">{options[sent].label}</div>
		{/if}
	</div>
	<div class="keyboard">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="quicktype"
			class:ready
			onpointerdown={dragStart}
			onpointermove={dragMove}
			onpointerup={dragEnd}
			onpointerleave={dragEnd}
		>
			{#each options as opt, i}
				<button
					class="chip"
					class:sent={picked === i}
					data-sfx="chat-send"
					data-reader-option={opt.readerLabel ?? opt.label}
					data-answer-id={opt.id ?? i}
					aria-pressed={picked === i}
					disabled={committed || !ready}
					onclick={() => choose(i)}
				>
					<span data-reader-label>{opt.label}</span>
				</button>
			{/each}
		</div>
		<div class="home-bar"></div>
	</div>
</div>
<SubmitAnswer
	disabled={picked === null || !ready}
	{committed}
	label="Send answer →"
	onsubmit={submit}
/>

<style>
	/* An inset phone screen — deliberately NOT the site serif/monochrome. */
	.phone {
		display: flex;
		flex-direction: column;
		/* A ceiling as well as a floor, so a long backlog scrolls inside the
		   phone like a real thread instead of stretching the handset down the
		   page. Short threads are unaffected — they simply don't reach it. */
		min-height: 26rem;
		max-height: 30rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', sans-serif;
		border: 1px solid #d6d6d4;
		border-radius: 1.2rem;
		overflow: hidden;
		background: #fff;
		box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
		animation: rise 0.45s 0.15s both;
	}
	/* iMessage-style conversation header: avatar over the group name. */
	.chat-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.65rem 0.5rem 0.5rem;
		background: #f7f7f7;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}
	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 50%;
		background: linear-gradient(#a9b0ba, #8e96a3);
		color: #fff;
		font-size: 1rem;
		font-weight: 500;
	}
	.chat-name {
		margin: 0;
		font-size: 0.75rem;
		color: #111;
	}
	.chat {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		flex: 1;
		min-height: 0; /* lets the flex child actually shrink so overflow applies */
		overflow-y: auto;
		padding: 1.1rem 1rem 1rem;
	}
	.sender-name {
		font-size: 0.7rem;
		color: #8e8e93;
		margin: 0 0 0.1rem 0.8rem;
	}
	.bubble {
		width: fit-content;
		max-width: 72%;
		padding: 0.5rem 0.85rem;
		font-size: 0.95rem;
		line-height: 1.35;
		animation: bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	/* Backlog bubbles are already on screen when the question opens, so they must
	   not replay the arrival pop that the typed messages use. */
	.chat-prompt {
		margin: 0 0 1.25rem;
		font-size: 1.85rem;
		font-style: italic;
		font-weight: 600;
		line-height: 1.25;
		text-align: center;
	}
	.bubble.settled {
		animation: none;
	}
	/* iMessage-style grey system notice, centred and unattributed. */
	.system {
		align-self: center;
		margin: 0.5rem 0;
		font-size: 0.72rem;
		color: #8a8a8e;
		text-align: center;
	}
	.bubble.in {
		align-self: flex-start;
		background: #e9e9eb;
		color: #111;
		border-radius: 1.1rem 1.1rem 1.1rem 0.3rem;
		transform-origin: bottom left;
	}
	.data-link {
		color: #007aff;
		text-decoration: underline;
		word-break: break-all;
	}
	.bubble.out {
		align-self: flex-end;
		background: #007aff;
		color: #fff;
		border-radius: 1.1rem 1.1rem 0.3rem 1.1rem;
		transform-origin: bottom right;
		margin-top: 0.45rem;
	}
	@keyframes bubble-pop {
		from {
			opacity: 0;
			transform: scale(0.55) translateY(0.6rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.typing {
		display: flex;
		gap: 0.28rem;
		padding: 0.65rem 0.8rem;
	}
	.typing span {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: #9a9aa0;
		animation: dot-pulse 1.1s infinite;
	}
	.typing span:nth-child(2) {
		animation-delay: 0.18s;
	}
	.typing span:nth-child(3) {
		animation-delay: 0.36s;
	}
	@keyframes dot-pulse {
		0%,
		60%,
		100% {
			opacity: 0.35;
			transform: none;
		}
		30% {
			opacity: 1;
			transform: translateY(-0.12rem);
		}
	}
	/* The keyboard, minus the keys: only the QuickType bar survives.
	   True to iOS, suggestions are bare text separated by hairlines —
	   no pill backgrounds. */
	.keyboard {
		background: #d1d4d9;
		padding: 0 0 0.15rem;
	}
	.quicktype {
		display: flex;
		align-items: stretch;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		scrollbar-width: none;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
		touch-action: pan-x;
		opacity: 0.35;
		pointer-events: none;
		transition: opacity 0.3s ease;
	}
	.quicktype.ready {
		opacity: 1;
		pointer-events: auto;
	}
	.quicktype:active {
		cursor: grabbing;
	}
	.quicktype::-webkit-scrollbar {
		display: none;
	}
	.chip {
		/* grow to share the bar evenly (true QuickType shows 3 equal slots),
		   but never shrink below the label — extras overflow into the scroll */
		flex: 1 0 auto;
		scroll-snap-align: start;
		background: none;
		border: none;
		padding: 0.8rem 1.2rem;
		font: inherit;
		font-size: 0.95rem;
		color: #111;
		white-space: nowrap;
		text-align: center;
		cursor: pointer;
	}
	.chip + .chip {
		border-left: 1px solid rgba(0, 0, 0, 0.12);
	}
	.chip:active:not(:disabled) {
		background: rgba(0, 0, 0, 0.06);
	}
	.chip.sent {
		color: #007aff;
		font-weight: 600;
	}
	.chip:disabled {
		cursor: default;
	}
	.chip:disabled:not(.sent) {
		opacity: 0.45;
	}
	.home-bar {
		width: 7rem;
		height: 4px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.35);
		margin: 0.6rem auto 0.4rem;
	}
</style>
