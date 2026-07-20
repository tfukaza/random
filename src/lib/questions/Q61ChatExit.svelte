<script>
	// chat-exit — the second ChatPick question, and it deliberately reuses the
	// format breakup-text established. Same phone, same QuickType bar, and by now
	// the taker knows what it means: something has happened and you get four
	// canned ways to react to it.
	//
	// The difference is that there is nothing to reply TO. The argument is over
	// before the question opens, the thread is scrolled to the bottom, and the
	// other person is gone. So the QuickType suggestions stop being replies and
	// become thoughts — the keyboard is still there, still offering to help, and
	// there is no longer anybody on the other end. Nothing points this out.
	//
	// THE CROSS-CHECK IS A BONUS ONLY, which makes it the one in the whole quiz
	// that cannot hurt you. argument-replay (chapter 1) asked whether you replay
	// arguments afterwards to argue them better. Reach for the replay option here
	// after saying you do that, or reach for the phone-off button after saying
	// you don't, and honesty goes UP. Mismatch and nothing happens at all — no
	// penalty, no acknowledgement. The quiz spends the whole run catching people
	// out; this is the one place it is only looking to agree with you.
	import ChatPick from './ChatPick.svelte';
	import { latestResponse } from '$lib/questions/metrics.svelte.js';

	let { onAnswer, qNumber } = $props();

	const title = $derived(`Question ${qNumber}`);
	const sender = 'Saturday plan';
	const prompt = 'What is the first thing that comes to mind?';

	// Already on screen when the question opens; ChatPick scrolls to the bottom,
	// so the taker has to scroll UP to find out how it got here. Kept mundane on
	// purpose — the subject of the argument is never named, because the moment it
	// is, people start answering about the subject instead of about themselves.
	const history = [
		{ from: 'them', text: 'so are we doing this or not' },
		{ from: 'you', text: "I said I'd sort it. I just haven't had a chance" },
		{ from: 'them', text: 'you said that on Tuesday' },
		{ from: 'you', text: "and I've had a week from hell, Sam" },
		{ from: 'them', text: "we all have. that's sort of the point" },
		{ from: 'you', text: 'what is that supposed to mean' },
		{ from: 'them', text: 'it means everyone else did their bit' },
		{ from: 'you', text: 'wow' },
		{ from: 'them', text: "no — what's unbelievable is that I'm the only one who ever chases this" },
		{ from: 'you', text: 'then stop chasing it' },
		{ from: 'them', text: 'fine' },
		{ from: 'system', text: 'Sam left the conversation.' }
	];

	// Nothing types in. The argument finished without you.
	/** @type {string[]} */
	const messages = [];

	const REPLAY = 2;
	const IMPULSIVE = new Set([0, 1]);

	const options = [
		{ label: 'Leave the chat too', score: { tempo: 2, coord: -2, social: -1 } },
		{ label: 'Turn my phone off', score: { social: -2, coord: -1, tempo: 1 } },
		{ label: 'Go back over what I should have said', score: { scope: -3, tempo: -2 } },
		{ label: 'Message them on their own', score: { coord: 2, social: 1 } }
	];

	// The bonus depends only on an answer given back in chapter 1, so it is known
	// at mount and can be folded into the option scores directly. ChatPick hands
	// back `options[i].score` and nothing else, and this keeps it that way rather
	// than growing an onPick hook for one caller.
	//
	// argument-replay is a 0–7 slider where 7 is "very much me". A missing entry
	// means a deep link past chapter 1 — no claim was made, so no bonus is owed.
	const claim = latestResponse('argument-replay')?.value;

	const scored = options.map((o, i) => {
		if (typeof claim !== 'number') return o;
		const aligned = (claim >= 5 && i === REPLAY) || (claim <= 2 && IMPULSIVE.has(i));
		return aligned ? { ...o, score: { ...o.score, honesty: 2 } } : o;
	});
</script>

<ChatPick {title} {sender} {prompt} {history} {messages} options={scored} {onAnswer} />
