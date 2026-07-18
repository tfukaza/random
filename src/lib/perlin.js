// Classic 2D Perlin noise, self-contained so the quiz has no runtime deps.
// Seeded, so a given question instance can be reproduced (and so the debug
// panel can reroll deliberately rather than hoping for a good-looking blob).

/**
 * Mulberry32 — small, fast, good enough to shuffle a permutation table.
 * @param {number} seed
 */
function rng(seed) {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** @param {number} t */
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
/** @param {number} a @param {number} b @param {number} t */
const lerp = (a, b, t) => a + t * (b - a);

/**
 * Gradient dot product. The low 2 bits of the hash pick one of four diagonal
 * gradient vectors — the standard cheap 2D variant.
 * @param {number} hash @param {number} x @param {number} y
 */
function grad(hash, x, y) {
	switch (hash & 3) {
		case 0:
			return x + y;
		case 1:
			return -x + y;
		case 2:
			return x - y;
		default:
			return -x - y;
	}
}

/**
 * Build a noise sampler for one seed.
 * @param {number} seed
 * @returns {(x: number, y: number) => number} samples in roughly -1…1
 */
export function makeNoise2D(seed) {
	const rand = rng(seed);
	const p = new Uint8Array(512);
	const perm = Array.from({ length: 256 }, (_, i) => i);
	// Fisher-Yates
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[perm[i], perm[j]] = [perm[j], perm[i]];
	}
	for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

	return function noise(x, y) {
		const xi = Math.floor(x) & 255;
		const yi = Math.floor(y) & 255;
		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);
		const u = fade(xf);
		const v = fade(yf);

		const aa = p[p[xi] + yi];
		const ab = p[p[xi] + yi + 1];
		const ba = p[p[xi + 1] + yi];
		const bb = p[p[xi + 1] + yi + 1];

		const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
		const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
		return lerp(x1, x2, v);
	};
}

/**
 * Fractal Brownian motion — sum octaves of the same sampler at doubling
 * frequency and halving amplitude. Gives the cloudy, multi-scale texture that
 * single-octave Perlin lacks. Normalized back to roughly -1…1.
 * @param {(x: number, y: number) => number} noise
 * @param {number} x @param {number} y @param {number} octaves
 */
export function fbm(noise, x, y, octaves = 4) {
	let total = 0;
	let amp = 1;
	let freq = 1;
	let norm = 0;
	for (let i = 0; i < octaves; i++) {
		total += noise(x * freq, y * freq) * amp;
		norm += amp;
		amp *= 0.5;
		freq *= 2;
	}
	return total / norm;
}
