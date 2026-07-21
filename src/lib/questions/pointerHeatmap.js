// Session-local pointer traces for the later heat-map question. Coordinates are
// normalized to the viewport, never tied to DOM targets, persisted, or sent
// anywhere. Mouse motion is sampled; taps and clicks are always retained.
const MAX_POINTS = 2400;
const MOVE_INTERVAL_MS = 42;
const MOVE_DISTANCE_PX = 6;

/** @type {Array<{x: number, y: number, kind: 'move' | 'press', pointerType: string}>} */
const points = [];
let lastMoveAt = 0;
let lastX = -Infinity;
let lastY = -Infinity;
let stopTracking = /** @type {null | (() => void)} */ (null);

function addPoint(/** @type {PointerEvent} */ event, /** @type {'move' | 'press'} */ kind) {
	if (!(window.innerWidth > 0) || !(window.innerHeight > 0)) return;
	points.push({
		x: Math.max(0, Math.min(1, event.clientX / window.innerWidth)),
		y: Math.max(0, Math.min(1, event.clientY / window.innerHeight)),
		kind,
		pointerType: event.pointerType || 'mouse'
	});
	// Preserve the whole run without allowing a long mouse session to grow the
	// array forever. Pairwise compaction keeps samples from every era.
	if (points.length > MAX_POINTS) {
		for (let read = 0, write = 0; read < points.length; read += 2, write += 1) {
			points[write] = points[read];
		}
		points.length = Math.ceil(points.length / 2);
	}
}

function move(/** @type {PointerEvent} */ event) {
	const at = performance.now();
	const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
	if (at - lastMoveAt < MOVE_INTERVAL_MS || distance < MOVE_DISTANCE_PX) return;
	lastMoveAt = at;
	lastX = event.clientX;
	lastY = event.clientY;
	addPoint(event, 'move');
}

export function startPointerHeatmap() {
	if (stopTracking || typeof document === 'undefined') return stopTracking ?? (() => {});
	const press = (/** @type {PointerEvent} */ event) => addPoint(event, 'press');
	document.addEventListener('pointermove', move, { capture: true, passive: true });
	document.addEventListener('pointerdown', press, { capture: true, passive: true });
	stopTracking = () => {
		document.removeEventListener('pointermove', move, { capture: true });
		document.removeEventListener('pointerdown', press, { capture: true });
		stopTracking = null;
	};
	return stopTracking;
}

export function resetPointerHeatmap() {
	points.length = 0;
	lastMoveAt = 0;
	lastX = -Infinity;
	lastY = -Infinity;
}

export function snapshotPointerHeatmap() {
	return points.map((point) => ({ ...point }));
}

