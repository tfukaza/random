// Curated reports sit above the ordinary seven-axis → plant mapping. They are
// intentionally rare findings based on exact metric totals, not another way to
// bucket the 128 standard personalities.

// Every negative honesty contribution that can coexist in one complete run.
// Keeping the audit legible here makes the threshold reviewable whenever a
// question's scoring changes. The wallet entry includes the +1 from claiming
// honesty level 6 and the -6 double-lie penalty for taking all $500.
export const MAX_DISHONESTY_BREAKDOWN = Object.freeze([
	{ source: 'artistic-claim contradiction', points: 3 },
	{ source: 'breakup face-saving lie', points: 3 },
	{ source: 'failed exact-phrasing memory claim', points: 3 },
	{ source: 'first failed detail claim', points: 3 },
	{ source: 'second failed detail claim', points: 3 },
	{ source: 'abandoned patience claim', points: 4 },
	{ source: 'challenge claim followed by giving up', points: 3 },
	{ source: 'maximum donation walk-back', points: 3 },
	{ source: 'delivery-driver walk-back', points: 1 },
	{ source: 'failed scene-memory claim', points: 2 },
	{ source: 'decision record contradiction', points: 3 },
	{ source: 'honesty claim and wallet double-lie, net', points: 5 }
]);

export const MAX_DISHONESTY_SCORE = MAX_DISHONESTY_BREAKDOWN.reduce(
	(total, item) => total + item.points,
	0
);
export const MIN_HONESTY_SCORE = -MAX_DISHONESTY_SCORE;

export const ASTROTURF_REPORT = Object.freeze({
	code: 'ASTROTURF',
	title: 'AstroTurf',
	blurb:
		'You cultivated the appearance of candor with remarkable consistency while supplying none of its living material. Every claim lies flat, uniform, and impressively green from a distance. The instrument found no roots to inspect. It therefore classifies you as AstroTurf: durable, presentable, and entirely manufactured.',
	reading:
		'Natural grass grows unevenly. It shows bare patches, changes with the weather, and occasionally admits that something has gone wrong. Yours arrived by the roll. These were not isolated evasions but a complete playing surface, laid contradiction by contradiction until truth had nowhere left to take root. It photographs beautifully. It is also plastic all the way down.',
	plant: Object.freeze({
		common: 'AstroTurf',
		scientific: 'ChemGrass',
		file: '/images/report-overrides/astroturf-field.jpg',
		artist: 'Corpx',
		sourceUrl: 'https://commons.wikimedia.org/wiki/File:James_russell_washington_state.jpg',
		license: 'CC BY 2.5',
		licenseUrl: 'https://creativecommons.org/licenses/by/2.5/'
	})
});

/**
 * Return a curated report only for an exact exceptional total.
 * @param {Record<string, number>} scores
 */
export function reportOverrideFor(scores) {
	return scores.honesty === MIN_HONESTY_SCORE ? ASTROTURF_REPORT : null;
}
