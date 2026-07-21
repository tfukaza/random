// The scene behind scene-watch → scene-recall, and the single source of truth
// for what is actually in it.
//
// ── THE ONE RULE ────────────────────────────────────────────────────────────
// The artwork is RENDERED FROM THIS DATA. Q67Scene places every prop at the
// grid cell named here; nothing in the scene is drawn at a hand-picked
// position. That is what makes the probes honest — "what was directly below the
// clock?" is answered by walking this grid, so the correct answer is derived
// from the same numbers that decided where the clock was painted. Hand-typing
// an answer key beside hand-placed art is the failure mode this avoids, and it
// is the one no amount of clicking the question would ever reveal.
//
// The scene is FIXED, never randomised. A varying scene would mean generating
// and verifying decoys at runtime; a fixed one lets every near-miss be authored
// and checked, the same discipline recall-trap's five phrasings follow.
//
// Composition is a spec, not decoration. Each branch of the recall question
// needs an affordance to exist here or it has nothing to ask:
//   spatial      → an unambiguous grid, so "the thing above X" has one answer
//   working      → a FEW props bearing a single digit, and others bearing only
//                  letters, so "which showed a number" has real and false picks
//   semantic     → readable signage
//   episodic     → timed events with a definite order
//   prospective  → a planted instruction the taker is asked to carry
//   (+ the strong-claim path → recreate the whole picture from its components)
//
// The recall questions are PHANTOM-TRAP choices, the same shape as recall-trap's
// near-miss wordings: each option is something you would only pick if you truly
// remember, and the wrong options are plausible confabulations. Spatial phrases
// positions relative to landmarks — some real, some pointing at empty cells.
// Working names objects — some carried a number, some only letters. The trap is
// always "recalling" something that was never there.

/** Grid the scene is laid out on. Cols left→right, rows top→bottom. */
export const COLS = 5;
export const ROWS = 4;

// Every prop, at its cell. `article` is how the recall options name it, so the
// options read as English rather than as ids. `number` (1–9, on a few props) is
// what the working-memory probe reads: props that carry one are the real picks,
// props that carry only letters or nothing are the traps. Kept small and
// single-digit so "your favourite number between 1 and 10" is literal.
//
// At most ONE prop per cell — enforced by a test. Two things in a cell would
// make "the thing above X" ambiguous and quietly break the spatial probe.
export const PROPS = [
	// col 0 — the kerb
	{ id: 'lamp', cell: [0, 1], article: 'The street lamp' },
	{ id: 'postbox', cell: [0, 2], article: 'The postbox' },
	{ id: 'cat', cell: [0, 3], article: 'The cat' },
	// col 1 — the shopfront. The probed column: sign / clock / door / mat.
	{ id: 'sign', cell: [1, 0], article: 'The shop sign' },
	{ id: 'clock', cell: [1, 1], article: 'The clock' },
	{ id: 'door', cell: [1, 2], article: 'The door', number: 4 },
	{ id: 'mat', cell: [1, 3], article: 'The doormat' },
	// col 2 — beside the shop
	{ id: 'window', cell: [2, 1], article: 'The window' },
	{ id: 'poster', cell: [2, 2], article: 'The poster' },
	{ id: 'crate', cell: [2, 3], article: 'The crate of fruit', number: 6 },
	// col 3 — the stop
	{ id: 'stop', cell: [3, 1], article: 'The bus stop sign', number: 9 },
	{ id: 'board', cell: [3, 2], article: 'The chalkboard' },
	{ id: 'bicycle', cell: [3, 3], article: 'The bicycle' },
	// col 4 — the road, and the sky above it
	{ id: 'meteor', cell: [4, 0], article: 'The meteor' },
	{ id: 'bus', cell: [4, 2], article: 'The bus' }
];

/** Props carrying a single-digit number, in scene order. The working probe's
 *  real picks; everything else is a trap. Derived so it can never drift from
 *  which props actually render a digit. */
export const NUMBERED = PROPS.filter((p) => p.number !== undefined);

/** @param {string} id */
export function prop(id) {
	const found = PROPS.find((p) => p.id === id);
	if (!found) throw new Error(`no prop "${id}" in the scene`);
	return found;
}

/** The prop occupying a cell, or null. @param {number} col @param {number} row */
export function at(col, row) {
	return PROPS.find((p) => p.cell[0] === col && p.cell[1] === row) ?? null;
}

// Spatial relations, derived. These are the ONLY way a probe may state what is
// next to what — never a literal.
/** @param {string} id */
export const below = (id) => at(prop(id).cell[0], prop(id).cell[1] + 1);
/** @param {string} id */
export const above = (id) => at(prop(id).cell[0], prop(id).cell[1] - 1);
/** @param {string} id */
export const leftOf = (id) => at(prop(id).cell[0] - 1, prop(id).cell[1]);
/** @param {string} id */
export const rightOf = (id) => at(prop(id).cell[0] + 1, prop(id).cell[1]);

// ── THE PEOPLE ───────────────────────────────────────────────────────────────
// The normal spatial probe asks the taker to tap where a person was standing on
// a blank canvas. That is only fair if the people's positions are known here and
// match what they saw — but the three people are PAINTED INTO the base image
// (`SCENE_BASE`), not rendered from data. So these coordinates were MEASURED off
// that image by hand, in its 500×400 viewBox:
//
//   ⚠ FRAGILE. If `SCENE_BASE` is ever regenerated or replaced, the people may
//   move, and these must be re-measured against the new picture or the tap-test
//   becomes unfair. There is no automatic check for this — the image is opaque
//   pixels. The robust fix is a peopleless base image plus a data-driven people
//   overlay; until then, treat this block as coupled to the current asset.
//
// Each person is a RECTANGLE around their figure — `(x, y)` top-left, `w`×`h` —
// which is tighter than a circle and, unlike circles, does not have to bulge to
// cover a tall thin figure. The three must NOT overlap: a tap belongs to exactly
// one person or to empty ground. Toggle the dev overlay in ScenePinpoint to
// check these boxes still sit on the painted figures.
export const PEOPLE = /** @type {const} */ ([
	{ id: 'woman', x: 126, y: 230, w: 40, h: 99 }, //     green coat, at the shop door
	{ id: 'backpack', x: 292, y: 235, w: 32, h: 94 }, //  waiting at the bus stop
	{ id: 'man', x: 340, y: 234, w: 32, h: 92 } //        hat and coat, at the bus stop
]);

/**
 * The person whose figure a tap lands inside, or null for empty ground. The
 * rectangles do not overlap, so at most one ever matches.
 * @param {number} x @param {number} y
 */
export function personAt(x, y) {
	for (const p of PEOPLE) {
		if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
	}
	return null;
}

// ── The things the probes ask about ─────────────────────────────────────────

/** Verbatim on the sign. The decoys below differ from it by exactly one thing. */
export const SIGN_TEXT = 'MERIDIAN & CO.';

/** The prospective payload. The chalkboard says to remember this. */
export const DOOR_COLOUR = 'dark green';

/** Deliberately unremarkable and never pointed at — the incidental detail. */
export const PEOPLE_COUNT = 3;

/** What the chalkboard reads, in the scene, in plain sight. */
export const BOARD_TEXT = 'REMEMBER THE COLOUR OF THE DOOR';

/** Painted into the generated bus destination panel. */
export const BUS_ROUTE = '428';

/** Printed into the generated postbox collection plate. */
export const POSTBOX_TEXT = 'COLLECTION\n15:30\n17:00';

// Exact authored inscriptions behind the generated raster art. `number` on a
// prop still means one FEATURED standalone digit; route and timetable digits
// are incidental details and deliberately do not change the normal probe.
export const PROP_INSCRIPTIONS = Object.freeze({
	sign: SIGN_TEXT,
	postbox: POSTBOX_TEXT,
	door: '4',
	crate: '6',
	stop: '9',
	board: BOARD_TEXT,
	bus: BUS_ROUTE
});

// Things that plausibly belong on a street corner but are NOT in this scene.
// The easy tier's phantom options come from here: a plain "did you see it?"
// trap, distinct from the normal tier's empty-relation and letters-only ones.
// Deliberately unlike any real prop (no "mailbox" — the postbox is real).
export const DISTRACTORS = [
	'A fire hydrant',
	'A traffic cone',
	'A wooden bench',
	'A newspaper stand',
	'A parked scooter'
];

/** An event that never happened, as the episodic-easy distractor. */
export const PHANTOM_EVENT = 'A dog barked';

// The four timed events, in the order they occur. `at` is the fraction of the
// observation window at which each fires; Q67Scene turns these into CSS
// animation delays, so the ORDER shown is this order by construction.
export const EVENTS = [
	{ id: 'lamp-on', at: 0.08, label: 'The street lamp flickers on' },
	{ id: 'cat-cross', at: 0.3, label: 'The cat crosses the doorway' },
	{ id: 'meteor-fall', at: 0.56, label: 'A meteor crosses the sky' },
	{ id: 'bus-leave', at: 0.82, label: 'The bus pulls away' }
];

/** How long the scene is watchable, before the recall question. */
export const WATCH_MS = 14_000;

// ── Probes ──────────────────────────────────────────────────────────────────
//
// One per memory type named in recallState's MEMORY_TYPES, plus `recreate` for
// takers who claimed a good memory in the strongest terms and so were never
// asked to name a type — they rebuild the whole picture.
//
// Choice probes are PHANTOM-TRAP lists: each option carries its own `correct`
// flag, and more than one option may be correct (spatial and working both have
// several real picks). This mirrors recall-trap's phrasings and lets the wrong
// options be genuine confabulations rather than obvious throwaways.
//
// Per P6 no probe acknowledges that other versions exist, and none explains why
// this one was chosen.

/**
 * One shape for every probe so consumers can branch on `format` without the
 * type narrowing collapsing.
 *   choice → options[] each with a `correct` flag (possibly several correct)
 *   digits → a single `answer` string
 *   order  → `answer` is an ordered id list, `items` the scrambled presentation
 *   recreate → no options; the answer is the placement, checked against PROPS
 *   pinpoint → no options; the answer is a tap on a blank canvas, hit-tested
 *              against PEOPLE
 * @typedef {{
 *   prompt: string,
 *   format: 'choice' | 'digits' | 'order' | 'recreate' | 'pinpoint',
 *   answer?: string | string[],
 *   options?: Array<{ label: string, correct: boolean }>,
 *   items?: Array<{ id: string, label: string }>
 * }} Probe
 */

// The earliest event, derived — episodic_easy's one correct answer. Reading it
// from the schedule (not hardcoding 'lamp-on') keeps it true if the timings move.
const firstEvent = [...EVENTS].sort((a, b) => a.at - b.at)[0];

/** @type {Record<string, Probe>} */
export const PROBES = {
	spatial: {
		// A personality question with a spatial-memory blade inside it. The taker
		// is asked which PERSON stood out to them, then handed a blank canvas and
		// asked to tap where that person was standing. Landing on a figure passes;
		// tapping empty ground is claiming to remember a person who was not there.
		// See PEOPLE / personAt, and ScenePinpoint.svelte.
		prompt: 'Of all the people in the scene, which one stood out to you the most, personally? Tap where they were standing.',
		format: 'pinpoint'
	},
	working: {
		// A number test wearing a personality hook. The real picks are the props
		// that actually bore a digit; the traps carried only letters. Claiming a
		// number on the sign or the chalkboard is the confabulation being caught.
		prompt: 'One of these objects showed your favourite number, somewhere between 1 and 10. Which was it?',
		format: 'choice',
		options: [
			{ label: prop('door').article, correct: true }, //   4
			{ label: prop('crate').article, correct: true }, //  6
			{ label: prop('stop').article, correct: true }, //   9
			{ label: prop('sign').article, correct: false }, //  letters only
			{ label: prop('board').article, correct: false } //  letters only
		]
	},
	semantic: {
		prompt: 'The shop had a sign. What did it read?',
		// One thing different each: the noun, the ampersand, a letter, the stop.
		format: 'choice',
		options: [
			{ label: 'MERIDIAN & SON', correct: false },
			{ label: 'MERIDIAN AND CO.', correct: false },
			{ label: SIGN_TEXT, correct: true },
			{ label: 'MERIDIEN & CO.', correct: false },
			{ label: 'MERIDIAN & CO', correct: false }
		]
	},
	episodic: {
		prompt: 'A few things happened while you watched. Put them back in the order they occurred.',
		format: 'order',
		answer: EVENTS.map((e) => e.id),
		// PRESENTED SCRAMBLED, and that is not a detail. RankList shows items in
		// the order it is handed them, so passing EVENTS straight through would
		// hand the taker a correctly-ordered list and ask them to confirm it.
		// Fixed rather than shuffled at runtime so it can be asserted never to
		// arrive already solved.
		items: ['bus-leave', 'lamp-on', 'meteor-fall', 'cat-cross'].map((id) => {
			const event = EVENTS.find((e) => e.id === id);
			if (!event) throw new Error(`scrambled order names "${id}", which is not an event`);
			return { id: event.id, label: event.label };
		})
	},
	prospective: {
		// The chalkboard planted "remember the colour of the door", and this
		// collects it — right here in scene-recall, not in a later question.
		// (There used to be a delayed `scene-note` collection six questions on;
		// it was cut as too basic, so prospective is now tested in place like the
		// other faculties.)
		prompt: 'The chalkboard asked you to remember something. What colour was the door?',
		format: 'choice',
		options: [
			{ label: DOOR_COLOUR, correct: true },
			{ label: 'navy blue', correct: false },
			{ label: 'oxblood red', correct: false },
			{ label: 'slate grey', correct: false },
			{ label: 'black', correct: false }
		]
	},
	recreate: {
		// The strong-claim gauntlet: rebuild the whole picture from its pieces.
		// No options — the answer is where every component lands, scored against
		// PROPS. See SceneRecreate.svelte.
		prompt: 'Recreate the scene. Put every piece back where it was.',
		format: 'recreate'
	},

	// ── EASY TIER ────────────────────────────────────────────────────────────
	// For takers who said they want an easy LIFE (easy-or-hard ≤ 2) or admitted
	// they are bad at every kind of memory. Difficulty and faculty are separate
	// vectors: easy does NOT remove the memory test — it keeps phantom traps and
	// scores on correctness — it only lowers the phrasing's cognitive load.
	// Spatial drops the relational computation for plain object names; working
	// asks for the bare digit; semantic swaps near-misses for obviously-wrong
	// names; episodic asks only what came first. The phantom is always something
	// that was genuinely NOT there.
	spatial_easy: {
		prompt: 'Which of these stood out to you the most?',
		format: 'choice',
		options: [
			{ label: prop('clock').article, correct: true },
			{ label: prop('bus').article, correct: true },
			{ label: prop('cat').article, correct: true },
			{ label: DISTRACTORS[0], correct: false }, // a fire hydrant — never there
			{ label: DISTRACTORS[1], correct: false } //  a traffic cone — never there
		]
	},
	working_easy: {
		prompt: 'Which of these objects displayed one large digit by itself?',
		format: 'choice',
		options: [
			{ label: prop('door').article, correct: true },
			{ label: prop('crate').article, correct: true },
			{ label: prop('stop').article, correct: true },
			{ label: prop('sign').article, correct: false },
			{ label: prop('board').article, correct: false }
		]
	},
	semantic_easy: {
		prompt: 'The shop had a sign. What did it read?',
		format: 'choice',
		// Obviously different, not near-misses — the easy version of the same test.
		options: [
			{ label: SIGN_TEXT, correct: true },
			{ label: 'GREGGS', correct: false },
			{ label: 'BOOTS', correct: false },
			{ label: 'THE CORNER SHOP', correct: false },
			{ label: 'PRICE & SONS', correct: false }
		]
	},
	episodic_easy: {
		prompt: 'What happened first, while you watched?',
		format: 'choice',
		// Only the earliest event is right; the other real events happened but not
		// first, and the dog never barked at all.
		options: [
			{ label: firstEvent.label, correct: true },
			{ label: EVENTS[3].label, correct: false },
			{ label: EVENTS[1].label, correct: false },
			{ label: PHANTOM_EVENT, correct: false }
		]
	}
};

// The named faculties, in one place, so routing can tell a real faculty from
// 'none'/null/nonsense.
const FACULTIES = ['spatial', 'working', 'semantic', 'episodic', 'prospective'];

/**
 * Which probe a taker gets. Two independent vectors decide it:
 *
 *   FACULTY  — `type`, recall-trap's soft-branch answer — picks WHICH probe.
 *   TIER     — `difficulty`, the easy-or-hard slider — picks how hard it is:
 *              7 (hard life) or a strong memory claim → recreate the whole scene;
 *              ≤ 2 (easy life) or "bad at all" (type 'none') → the easy variant;
 *              anything between → the normal phantom-trap version.
 *
 * Easy still tests memory — it keeps the traps — it just phrases them plainly.
 * A strong claim and hard-life both reach recreate regardless of faculty, since
 * rebuilding the scene tests every faculty at once. Deep-links (no type, no
 * difficulty) land on normal spatial, answerable by anyone who looked.
 *
 * @param {string | null} type
 * @param {boolean} claimedStrongly
 * @param {number | null | undefined} [difficulty] the easy-or-hard value, 1–7
 */
export function probeFor(type, claimedStrongly, difficulty) {
	if (claimedStrongly || difficulty === 7) return { key: 'recreate', ...PROBES.recreate };
	const faculty = type && FACULTIES.includes(type) ? type : 'spatial';
	const easy = type === 'none' || (typeof difficulty === 'number' && difficulty <= 2);
	// Not every faculty has an easy variant (prospective's holding probe has no
	// simpler form); fall back to the normal one when it is missing.
	const easyKey = `${faculty}_easy`;
	const key = easy && easyKey in PROBES ? easyKey : faculty;
	return { key, ...PROBES[key] };
}
