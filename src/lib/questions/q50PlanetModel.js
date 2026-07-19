const TARGET_COUNT = 17;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const DAMAGE_RADIUS_RADIANS = (40 * Math.PI) / 180;

/** @typedef {'land' | 'ocean'} Surface */
/** @typedef {{ id: string, label: string, description: string, surface: Surface, penalty: Record<string, number> }} TargetDefinition */

/** @type {TargetDefinition[]} */
const DEFINITIONS = [
	{
		id: 'largest-city',
		label: 'Largest City',
		description: 'The most populated city on the planet.',
		surface: 'land',
		penalty: { social: -3 }
	},
	{
		id: 'fishing-ground',
		label: 'Grand Fishing Ground',
		description: 'A food source and the ecological backbone of several seas.',
		surface: 'ocean',
		penalty: { scope: -3 }
	},
	{
		id: 'power-plant',
		label: 'City Power Plant',
		description: 'Supplies nearly all power to the largest city.',
		surface: 'land',
		penalty: { creative: -1 }
	},
	{
		id: 'university',
		label: 'Planetary University',
		description: 'Home to the most capable researchers on the planet.',
		surface: 'land',
		penalty: { creative: -3, scope: -2 }
	},
	{
		id: 'floating-city',
		label: 'Floating City',
		description: 'A dense ocean settlement with no landward evacuation route.',
		surface: 'ocean',
		penalty: { social: -3 }
	},
	{
		id: 'vast-farm',
		label: 'Vast Farm',
		description: 'Produces most of the planet\'s staple food.',
		surface: 'land',
		penalty: { scope: -2 }
	},
	{
		id: 'spaceport',
		label: 'Spaceport',
		description: 'The product of generations of planetary investment.',
		surface: 'land',
		penalty: { creative: -2, scope: -3 }
	},
	{
		id: 'nursery-reef',
		label: 'Nursery Reef',
		description: 'The primary breeding ground for the ocean biosphere.',
		surface: 'ocean',
		penalty: { scope: -3 }
	},
	{
		id: 'seed-vault',
		label: 'Seed Vault',
		description: 'The planet\'s reserve against future crop failure.',
		surface: 'land',
		penalty: { scope: -3 }
	},
	{
		id: 'hospital',
		label: 'Central Hospital',
		description: 'The only center capable of providing advanced emergency care.',
		surface: 'land',
		penalty: { social: -2 }
	},
	{
		id: 'desalination',
		label: 'Desalination Platform',
		description: 'Converts ocean water into drinking water for two continents.',
		surface: 'ocean',
		penalty: { scope: -2 }
	},
	{
		id: 'reservoir',
		label: 'Freshwater Reservoir',
		description: 'The largest readily available source of drinking water.',
		surface: 'land',
		penalty: { scope: -2 }
	},
	{
		id: 'archive',
		label: 'Planetary Archive',
		description: 'Contains the only complete record of planetary history.',
		surface: 'land',
		penalty: { creative: -2, scope: -3 }
	},
	{
		id: 'tidal-array',
		label: 'Tidal Power Array',
		description: 'Supplies clean power to the ocean settlements.',
		surface: 'ocean',
		penalty: { scope: -2 }
	},
	{
		id: 'communications',
		label: 'Communications Array',
		description: 'Coordinates communication across the entire world.',
		surface: 'land',
		penalty: { social: -3 }
	},
	{
		id: 'climate-station',
		label: 'Climate Station',
		description: 'Maintains the atmospheric systems that keep the planet stable.',
		surface: 'land',
		penalty: { scope: -3 }
	},
	{
		id: 'foundry',
		label: 'Industrial Foundry',
		description: 'Produces most heavy machinery and replacement infrastructure.',
		surface: 'land',
		penalty: { creative: -1 }
	}
];

/** @param {[number, number, number]} v @returns {[number, number, number]} */
function rotateForPresentation(v) {
	const xAngle = 0.19;
	const yAngle = -0.31;
	const [x, y, z] = v;
	const y1 = y * Math.cos(xAngle) - z * Math.sin(xAngle);
	const z1 = y * Math.sin(xAngle) + z * Math.cos(xAngle);
	return [
		x * Math.cos(yAngle) + z1 * Math.sin(yAngle),
		y1,
		-x * Math.sin(yAngle) + z1 * Math.cos(yAngle)
	];
}

export const TARGETS = DEFINITIONS.map((definition, index) => {
	const y = 1 - (2 * (index + 0.5)) / TARGET_COUNT;
	const radius = Math.sqrt(1 - y * y);
	const angle = index * GOLDEN_ANGLE;
	const normal = rotateForPresentation([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
	return { ...definition, normal };
});

export const IMPACT_DIRECTION = /** @type {[number, number, number]} */ ([0, 0.6, 0.8]);

/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/** @param {number} value */
function signedRound(value) {
	return Math.sign(value) * Math.round(Math.abs(value));
}

/**
 * Distribute one fixed damage budget around a spherical impact point.
 * @param {[number, number, number]} impactNormal
 */
export function damageAt(impactNormal) {
	const length = Math.hypot(...impactNormal) || 1;
	const point = impactNormal.map((component) => component / length);
	const weighted = TARGETS.map((target) => {
		const dot = target.normal.reduce((sum, component, i) => sum + component * point[i], 0);
		const angle = Math.acos(clamp(dot, -1, 1));
		const proximity = Math.max(0, 1 - angle / DAMAGE_RADIUS_RADIANS);
		return { target, angle, weight: proximity * proximity };
	});

	let total = weighted.reduce((sum, item) => sum + item.weight, 0);
	if (total <= Number.EPSILON) {
		const nearest = weighted.reduce((best, item) => (item.angle < best.angle ? item : best));
		nearest.weight = 1;
		total = 1;
	}

	return weighted.map((item) => ({ ...item.target, angle: item.angle, share: item.weight / total }));
}

/**
 * Largest-remainder rounding keeps the visible percentages honest.
 * @param {ReturnType<typeof damageAt>} damage
 */
export function displayPercentages(damage) {
	const rows = damage.map((item, index) => {
		const exact = item.share * 100;
		return { index, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
	});
	let remaining = 100 - rows.reduce((sum, row) => sum + row.floor, 0);
	for (const row of [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
		if (remaining-- <= 0) break;
		row.floor += 1;
	}
	return damage.map((item, index) => ({ ...item, percent: rows[index].floor }));
}

/**
 * @param {ReturnType<typeof damageAt>} damage
 * @param {{ elapsedMs: number, autoLocked: boolean }} decision
 */
export function scoreImpact(damage, decision) {
	/** @type {Record<string, number>} */
	const weighted = {};
	for (const item of damage) {
		for (const [key, value] of Object.entries(item.penalty)) {
			weighted[key] = (weighted[key] ?? 0) + value * item.share;
		}
	}

	/** @type {Record<string, number>} */
	const delta = {};
	for (const [key, value] of Object.entries(weighted)) delta[key] = signedRound(value);

	const largestShare = Math.max(...damage.map((item) => item.share));
	const concentration = clamp((largestShare - 0.5) / 0.5, 0, 1);
	delta.risk = signedRound(-3 + 6 * concentration);
	delta.coord = -delta.risk;
	delta.tempo = decision.autoLocked
		? -3
		: decision.elapsedMs <= 10000
			? 3
			: decision.elapsedMs <= 20000
				? 1
				: -1;
	delta.honesty = 0;
	return delta;
}
