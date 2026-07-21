// Cross-question state for the scene pair: whether the taker actually watched
// the scene, written by scene-watch and read by scene-recall.
//
// It carries no answers. Everything the probes need is FIXED and already in
// sceneModel.js, so there is nothing about the scene worth passing forward —
// only whether it happened at all. Which memory faculty gets probed lives in
// recallState's `type`, because that is a fact about the taker rather than
// about the scene.
//
// `seen` is false on a deep link straight into scene-recall. Consumers must
// treat that as "asked about something they never saw" and soften rather than
// punish — same fallback discipline as boxState and patienceState. Nothing in
// this quiz should ever bill someone for missing a question it never showed
// them.
export const scene = $state({
	/** @type {boolean} true once the watch window has run to its end */
	seen: false
});

export function clearScene() {
	scene.seen = false;
}

// Dev-only console handle, matching __stash and __recall.
//   __scene.scene.seen = true    → pretend the scene was watched
if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore
	window.__scene = { scene, clearScene };
}
