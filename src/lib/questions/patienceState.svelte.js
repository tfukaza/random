// Cross-question state: the self-reported patience rating (1–7) from Q29.
//
// The rating doesn't just change one question — it changes how *every* question
// after Q29 is delivered, until the next interlude clears the air:
//
//   - `PatienceLens.svelte`, applied by the orchestrator to each question in that
//     band. It's content-agnostic (it can't know what any given question says), so
//     it works at the presentation layer: a blur-out flash for the impatient, a
//     slow downward wipe for the patient.
//
// A consumer must handle `value === null` (deep-linked straight past Q29, or a
// fresh load) the same way Q27Survivor handles an empty backpack.
export const patience = $state({
	/** @type {number | null} 1 = very impatient … 7 = very patient */
	value: null,
	/**
	 * Set once the taker uses an escape hatch ("Sorry — I actually prefer
	 * normal"). Lives here rather than in a component because the lens spans
	 * several questions: bailing out of one should end the bit for all of them,
	 * not be re-offered on every screen.
	 */
	bailed: false,
	/** @type {'' | 'fast' | 'normal' | 'slow'} dev-only override; '' = follow the answer */
	debugForce: ''
});

/**
 * The single source of truth for which delivery a rating earns.
 * @returns {'fast' | 'normal' | 'slow'}
 */
export function patienceMode() {
	// Debug override wins over everything, so any mode stays testable even after
	// bailing out.
	if (patience.debugForce) return patience.debugForce;
	if (patience.bailed) return 'normal';
	const v = patience.value;
	if (typeof v !== 'number') return 'normal';
	if (v <= 2) return 'fast';
	if (v >= 6) return 'slow';
	return 'normal';
}

/** Escape hatch. Clears the debug override too, so bailing always actually lands. */
export function bailOut() {
	patience.bailed = true;
	patience.debugForce = '';
}
