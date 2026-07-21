// The permanent public-facing record of questions removed from the live flow.
// Keep source components when they still exist; this catalog is deliberately
// presentation-only so a retired interaction can never re-enter the quiz just
// because the archive renders it.
export const retiredQuestions = [
	{
		id: 'chat-exit',
		formerNumber: 43,
		prompt: 'What is the first thing that comes to mind?',
		concept: 'A group chat after an argument, ending with someone leaving.',
		reason: 'Its payoff depended on the earlier argument-replay wording, and its phone interface repeated the breakup-text question too closely.',
		preserved: true
	},
	{
		id: 'metrics-audit',
		prompt: 'This is your current metric. Do you agree with it?',
		concept: 'A panel showing answer time, revisions, and other collected statistics.',
		reason: 'The question attached to the statistics duplicated the decision audit. The more visual pointer heat map took its place.'
	},
	{
		id: 'planet-alignment',
		prompt: 'What is your ideal planetary alignment?',
		concept: 'Drag planets and the Moon around nested orbital tracks.',
		reason: 'It was effectively impossible to solve and felt punishing instead of revealing.'
	},
	{
		id: 'big-decision',
		prompt: 'When making a big decision, you tend to…',
		concept: 'Choose gut instinct, a pros-and-cons list, advice, or delay.',
		reason: 'It was a generic multiple-choice prompt, and nearby questions already taught the same interaction.'
	},
	{
		id: 'rorschach',
		prompt: 'What do you see in here?',
		concept: 'Interpret a field of colorful Perlin noise as a cat, cloud, car, or house.',
		reason: 'Pure noise provided one visual joke but no claim to test or meaningful later payoff.'
	},
	{
		id: 'ideal-residence',
		prompt: 'Where would you ideally live?',
		concept: 'Choose between a submarine, blimp, and space station.',
		reason: 'Cut during the chapter-three and chapter-four restructuring; no more specific reason was recorded.'
	},
	{
		id: 'flooded-building',
		prompt: 'How would you get groceries in a fifty-storey flooded building?',
		concept: 'An absurd survival problem in a submerged apartment tower.',
		reason: 'Cut during the chapter-four restructuring; no more specific reason was recorded.'
	},
	{
		id: 'dinner-budget',
		prompt: 'How would you spend your Friday-night dinner budget?',
		concept: 'Allocate money along a dinner-budget ladder.',
		reason: 'It was too generic for chapter one and lacked the visual element required by chapter two.'
	},
	{
		id: 'picnic-fridge',
		prompt: 'Which item would you take from the fridge?',
		concept: 'Plant one of four picnic items for a later memory test.',
		reason: 'The later recall question changed to test exact wording, leaving this memory plant without a purpose.'
	},
	{
		id: 'ideal-income',
		prompt: 'What is your ideal income?',
		concept: 'Choose an income from an ascending set of values.',
		reason: 'Everyone chose the maximum, so the answer distinguished nothing.'
	},
	{
		id: 'hundred-storey-apartment',
		prompt: 'Which floor would you choose in a hundred-storey apartment building?',
		concept: 'Pick an ideal floor from the building.',
		reason: 'Like ideal income, almost everyone selected the largest option.'
	},
	{
		id: 'absurd-reprises',
		prompt: 'Three parody versions of earlier questions.',
		concept: 'Callbacks such as delaying your gut instinct.',
		reason: 'The reprises were not funny enough to justify three additional slots.'
	},
	{
		id: 'stop-and-help',
		prompt: 'How likely are you to stop and help?',
		concept: 'An early chapter-one self-report question.',
		reason: 'Removed during the opening-chapter walkthrough; no more specific reason was recorded.'
	},
	{
		id: 'early-chapter-one-cuts',
		prompt: 'Three early opening questions formerly numbered 4, 5, and 8.',
		concept: 'Early drafts from the ordinary-question walkthrough.',
		reason: 'Removed as weak during the chapter-one edit; their individual reasons were not recorded.'
	}
];
