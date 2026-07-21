// A 4×4 traversal in which every consecutive pair, including the wrap, avoids
// sharing an edge. Keeping this deterministic makes every circle participate
// evenly while preserving the optical illusion's irregular-looking jumps.
export const ROTATION_ORDER = Object.freeze([0, 2, 4, 6, 8, 10, 12, 14, 1, 3, 5, 7, 9, 11, 13, 15]);

/**
 * Make the real burst harder to spot for takers who claimed the strongest
 * attention to detail. Missing/deep-linked claims use the normal 3° rate.
 * @param {unknown} detailLevel
 */
export function rotationRateForDetail(detailLevel) {
	if (detailLevel === 1) return 0.5;
	if (detailLevel === 2) return 1;
	return 3;
}

/** @param {number} a @param {number} b @param {number} [columns] */
export function areAdjacentCircles(a, b, columns = 4) {
	if (a < 0 || b < 0 || a === b) return false;
	const ar = Math.floor(a / columns);
	const ac = a % columns;
	const br = Math.floor(b / columns);
	const bc = b % columns;
	return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

/** @param {number | null} current @param {readonly number[]} [order] */
export function nextScheduledCircle(current, order = ROTATION_ORDER) {
	if (!order.length) return -1;
	const at = current === null ? -1 : order.indexOf(current);
	return order[(at + 1 + order.length) % order.length];
}

/**
 * Continue through the schedule while respecting temporary hover and persistent
 * tap exclusions. Skipping an entry rechecks adjacency because the next item
 * after a skipped circle is not automatically safe relative to the last one
 * that actually rotated.
 * @param {number | null} current
 * @param {Iterable<number>} excluded
 * @param {readonly number[]} [order]
 */
export function nextEligibleCircle(current, excluded, order = ROTATION_ORDER) {
	const blocked = new Set(excluded);
	const start = current === null ? -1 : order.indexOf(current);
	for (let step = 1; step <= order.length; step += 1) {
		const candidate = order[(start + step + order.length) % order.length];
		if (blocked.has(candidate) || candidate === current) continue;
		if (current !== null && areAdjacentCircles(current, candidate)) continue;
		return candidate;
	}
	return -1;
}

export function rotationOrderIsValid(order = ROTATION_ORDER) {
	if (new Set(order).size !== order.length) return false;
	return order.every((current, i) => {
		const next = order[(i + 1) % order.length];
		return current !== next && !areAdjacentCircles(current, next);
	});
}
