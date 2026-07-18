// Geometry and (approximate) ephemeris for the planetary-alignment question.
// Pure module — no Svelte, no DOM — so the position math stays testable and
// swappable.

/** SVG viewBox is square; the Sun sits dead center. */
export const VIEW = 520;
export const CX = VIEW / 2;
export const CY = VIEW / 2;
export const SUN_R = 15;

/** Inner planets, sun-outward. `orbit` and `r` are in viewBox units. */
export const PLANETS = [
	{ id: 'mercury', label: 'Mercury', orbit: 62, r: 4.5 },
	{ id: 'venus', label: 'Venus', orbit: 100, r: 7.5 },
	{ id: 'earth', label: 'Earth', orbit: 145, r: 8 },
	{ id: 'mars', label: 'Mars', orbit: 196, r: 6 }
];

/** The Moon orbits Earth, so its radius is measured from Earth, not the Sun. */
export const MOON = { id: 'moon', label: 'Moon', orbit: 26, r: 3.2 };

/**
 * Point on a circle. Screen y grows downward, so subtracting sin makes
 * increasing angles run counterclockwise — the direction the planets actually
 * travel when viewed from ecliptic north.
 * @param {number} cx @param {number} cy @param {number} radius @param {number} deg
 */
export function polar(cx, cy, radius, deg) {
	const rad = (deg * Math.PI) / 180;
	return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
}

/**
 * Angle (degrees, 0–360) of a point measured from a center, matching `polar`.
 * @param {number} cx @param {number} cy @param {number} x @param {number} y
 */
export function angleOf(cx, cy, x, y) {
	return norm((Math.atan2(cy - y, x - cx) * 180) / Math.PI);
}

/** Wrap to 0–360. @param {number} deg */
export function norm(deg) {
	return ((deg % 360) + 360) % 360;
}

const J2000 = Date.UTC(2000, 0, 1, 12);

// Mean longitude at J2000 (deg) and mean motion (deg/day). Planet values are
// heliocentric; the Moon's is geocentric, which is exactly what we want since
// it's drawn orbiting Earth.
const ELEMENTS = {
	mercury: { l0: 252.25, rate: 4.09233445 },
	venus: { l0: 181.98, rate: 1.60213034 },
	earth: { l0: 100.46, rate: 0.98560028 },
	mars: { l0: 355.43, rate: 0.5240384 },
	moon: { l0: 218.32, rate: 13.17639648 }
};

/**
 * Rough real positions for a given moment: mean longitude only, ignoring
 * eccentricity and inclination. Good to a few degrees — far finer than an
 * abstract diagram can show.
 *
 * This is the seam for real data: swap this one function for an ephemeris API
 * call and nothing else in the app has to change.
 *
 * @param {number | Date} [when] epoch ms or Date; defaults to now
 * @returns {Record<string, number>} angles in degrees, keyed by body id
 */
export function approximateAngles(when = Date.now()) {
	const ms = when instanceof Date ? when.getTime() : when;
	const days = (ms - J2000) / 86400000;
	/** @type {Record<string, number>} */
	const out = {};
	for (const [id, { l0, rate }] of Object.entries(ELEMENTS)) {
		out[id] = norm(l0 + rate * days);
	}
	return out;
}
