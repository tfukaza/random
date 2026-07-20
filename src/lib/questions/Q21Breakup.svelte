<script>
	// breakup-text — a breakup arriving by message, answered from the QuickType
	// suggestion bar. See ChatPick for the machinery.
	//
	// The input IS the joke, and it survived the retheme from the old scam-text
	// version intact: there is no keyboard. You cannot write your own reply to
	// the worst message you have ever received — you get four canned suggestions
	// and you pick one, which is roughly what everyone does anyway. Nothing in
	// the question acknowledges this.
	//
	// Placed immediately before the font/palette/button/wallpaper block so the
	// taker walks into "which typeface do you prefer?" straight out of this. The
	// quiz never mentions the juxtaposition; it just moves on.
	import ChatPick from './ChatPick.svelte';
	let { onAnswer, qNumber } = $props();

	const title = $derived(`Question ${qNumber}`);
	// A first name, not a number — the old version's point was that the sender was
	// a stranger, and this one's is the opposite.
	const sender = 'Sam';
	const messages = [
		"I've been sitting on this for weeks and I hate that I'm doing it like this.",
		"I don't think we should keep going. I'm sorry.",
		"I do still care about you. I just don't think that's enough anymore."
	];

	// The spread is about what you reach for when there is nothing good to reach
	// for: slow it down, close it down, ask for the reasons, or save face.
	const options = [
		// Refusing the medium — the only answer that asks for another person.
		{ label: 'Can we talk about this in person?', score: { coord: 2, social: 1, tempo: -2 } },
		// Complete, self-contained, and over.
		{ label: 'Okay.', score: { coord: -2, social: -2, tempo: 2 } },
		// Wants the specifics, at the exact moment specifics will not help.
		{ label: 'What did I do wrong?', score: { scope: -2, social: 1, risk: -1 } },
		// The face-saving lie, and the reason honesty is scored here at all.
		{ label: 'Honestly, I was thinking the same thing', score: { honesty: -3, risk: 1, scope: 1 } }
	];
</script>

<ChatPick {title} {sender} {messages} {options} {onAnswer} />
