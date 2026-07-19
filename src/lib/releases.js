/**
 * Public, user-facing release history. Keep the newest release first.
 * Add an entry here whenever a major product update ships; /releases renders
 * this list directly so the in-app notes stay in step with the code.
 */
export const releases = [
	{
		version: '0.2.1',
		date: 'July 19, 2026',
		dateIso: '2026-07-19',
		label: 'Audio polish',
		summary: 'A small follow-up that restores two missing musical transitions.',
		sections: [
			{
				title: 'Fixed',
				items: [
					'Fast music now winds down like a slowing record when normal speed is restored.',
					'Taking the quiz again now stops the report theme before the opening music restarts.'
				]
			}
		]
	},
	{
		version: '0.2',
		date: 'July 19, 2026',
		dateIso: '2026-07-19',
		label: 'The second reading',
		summary: 'Every report gains a second, more personal paragraph — and the asteroid runs smoother.',
		sections: [
			{
				title: 'Added',
				items: [
					'All 128 personality reports now include a reading: a quieter paragraph beneath the verdict that describes what your result says about how you actually move through life.',
					'The final report reveal is repaced to give the new paragraph its own moment.'
				]
			},
			{
				title: 'Fixed',
				items: [
					'The asteroid emergency no longer stutters while rotating the planet on slower devices.'
				]
			}
		]
	},
	{
		version: '0.1.1',
		date: 'July 18, 2026',
		dateIso: '2026-07-18',
		label: 'Mobile repairs',
		summary: 'A small release for phones, sound, and one famously inconsistent font.',
		sections: [
			{
				title: 'Fixed',
				items: [
					'Audio now starts more reliably on iPhone and iPad, including devices in silent mode.',
					'Music resumes when iOS interrupts or suspends the audio session.',
					'The quiz no longer appears shrunken on narrow screens after the blood-pool sequence.',
					'The playful font answer now looks consistent across iOS, macOS, Windows, and Android.',
					'Copied reports now record which version of the test produced them.'
				]
			}
		]
	},
	{
		version: '0.1',
		date: 'July 18, 2026',
		dateIso: '2026-07-18',
		label: 'First release',
		summary: 'The complete first edition of What kind of person are you?',
		sections: [
			{
				title: 'What’s inside',
				items: [
					'54 very different questions, from quiet choices to ranking, memory, balance, math, and an asteroid emergency.',
					'Questions that remember earlier answers and occasionally test whether your story holds together.',
					'An adaptive patience trial that can slow the quiz to a crawl or fire it past at 1,500 words per minute.',
					'A seven-axis temperament profile with 128 possible outcomes and a questionably appropriate plant specimen.',
					'An original soundscape with music, tactile effects, and a sound-off option.',
					'A two-part final report, shareable result, and one fully realized asteroid impact.'
				]
			}
		]
	}
];

/**
 * The version every runtime reference must use — the copied report stamp, the
 * footer link, and anything added later. Derived from the newest entry above so
 * a release is one edit here (plus the package.json bump per AGENTS.md); no
 * other file may hardcode a version string.
 */
export const CURRENT_VERSION = releases[0].version;
