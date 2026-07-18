// Cross-question state: the self-reported patience rating (1–7) from Q29.
//
// PENDING: nothing reads this yet. It exists because Q29 is meant to be paid off
// by a future time-based question — one that actually makes you wait, and tunes
// or judges that wait against the patience you claimed here. Written on every
// Q29 commit, so a replay overwrites it naturally.
//
// A consumer must handle `value === null` (deep-linked straight past Q29, or a
// fresh load) the same way Q27Survivor handles an empty backpack.
export const patience = $state({
	/** @type {number | null} 1 = very impatient … 7 = very patient */
	value: null
});
