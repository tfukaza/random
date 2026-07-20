<script>
	// coffee-button — a completely ordinary question about supporting a creator,
	// asked straight, and the setup for the only moment in this quiz that reaches
	// out of the fiction. Whatever you answer here, coffee-prompt collects on it
	// immediately.
	//
	// The premise is deliberately modest. "Genuinely interesting, not
	// life-changing" is the hard case: anyone would pay for something that
	// astonished them, and nobody is really being asked about that. Made it
	// non-specific too — a video, a track, doesn't matter — because naming the
	// medium invites people to answer about a medium instead of about themselves.
	//
	// The ladder is money, so it scores coord (lone wolf ↔ team player) and
	// social rather than risk. Handing a stranger five dollars is not a gamble,
	// it is a position on whether other people's work is your problem.
	//
	// The scenario is the SMALL text and the amount is the HEADLINE, and
	// coffee-prompt repeats that exact shape one question later with the quiz
	// itself as the subject. The parallel is the entire mechanism: the second
	// question is visibly the same question, and the only thing that changed is
	// who is asking.
	import PickList from './PickList.svelte';

	let { onAnswer } = $props();

	const premise =
		"You're scrolling, and you come across something a creator made — a video, a track, it doesn't matter which. It's genuinely interesting. Not life-changing, just good, and clearly made by someone who cared. At the bottom of the page there's a small button: Buy me a coffee.";
	const prompt = 'How much are you willing to donate?';

	// $1 / $5 / $10. This briefly ran $5 / $7 / $10 because Ko-fi appeared to
	// enforce a $5 floor; the account's default amounts are configurable, so the
	// floor is gone and the ladder is back to a shape with a genuinely trivial
	// rung at the bottom.
	//
	// That bottom rung matters. A dollar is small enough that refusing it is a
	// statement rather than a budget decision, which is what makes the gap
	// between the first two options the real question — and it lines the ladder
	// back up with clause 5.4 of terms-consent, which asks for "at least $1".
	const options = [
		{ label: "Nothing. Money doesn't come easy around here", score: { coord: -2, social: -1, risk: -1 } },
		{ label: 'Give them $1, maybe a little less — a token of appreciation', score: { coord: 1, social: 1 } },
		{
			label: 'Give them $5. It was legitimately interesting and I want to support creators',
			score: { coord: 2, social: 2, creative: 1 }
		},
		{ label: "Give them $10. I'm feeling generous today", score: { coord: 3, social: 2, risk: 1 } }
	];

</script>

<PickList {premise} {prompt} {options} {onAnswer} />
