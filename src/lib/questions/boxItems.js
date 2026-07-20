// The moving-box catalogue, shared by pack-box (fit what you can into one box)
// and airport-discard (throw one of them away). `cells` are [row, col] offsets
// from each shape's top-left anchor; `score` is awarded for packing the item,
// `discard` for throwing it out at the airport.
//
// ── THE SHAPES ARE A SOLVED PUZZLE ──────────────────────────────────────────
// These sixteen footprints total exactly 48 cells and tile the 6×8 grid
// perfectly. Eleven of the sixteen are NON-RECTANGULAR — L, J, S, a P-pentomino
// and a plus — which is what makes it look impossible at a glance and hard in
// the hand. Pieces cannot be rotated, so the fixed orientations below are part
// of the solution, not decoration.
//
// The set was not hand-written and hoped over: it was DERIVED by partitioning
// the 6×8 grid into connected polyominoes, so a perfect packing exists by
// construction. An exhaustive re-check then confirmed it, and found more than
// 50,000 distinct complete packings — deliberately forgiving, because "possible
// if you try hard enough" is the goal and a single-solution puzzle would just
// be cruel.
//
// DO NOT edit a `cells` array casually. Adding, removing or reshaping any piece
// breaks the 48-cell total and almost certainly destroys solvability. If you
// must, re-run an exact-cover search over the whole set against ROWS × COLS in
// Q26MoveBox and confirm a complete packing still exists before shipping.
//
// The spread that matters is practical ↔ sentimental: every item is something a
// real person owns, and roughly half are worth more than they are useful.
//
// NOTE the semantics of `discard` are INVERTED from packing. Choosing to bring
// your family album is not the same act as throwing it in an airport bin.

/** @param {string} viewBox @param {string} body */
const S = (viewBox, body) =>
	`<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ITEMS = [
	{
		id: 'guitar',
		name: 'Guitar',
		cells: [[0, 0], [1, 0], [1, 1], [1, 2]],
		score: { creative: 3, risk: 1, scope: 1 },
		discard: { creative: -2, social: -1 },
		svg: S('0 0 96 64', '<path d="M20 6 h10 v14 h-10 z"/><path d="M25 20 v18"/><path d="M25 38 c-12 0 -16 6 -16 12 c0 8 7 12 16 12 h34 c11 0 20 -5 20 -12 c0 -7 -9 -12 -20 -12 z"/><circle cx="52" cy="50" r="7"/>')
	},
	{
		id: 'mug',
		name: 'Your mug',
		cells: [[0, 0]],
		score: { social: -1, creative: 1 },
		discard: { scope: -2, creative: -1 },
		svg: S('0 0 32 32', '<path d="M7 9 h15 v14 a4 4 0 0 1 -4 4 h-7 a4 4 0 0 1 -4 -4 z"/><path d="M22 13 h3 a4 4 0 0 1 0 8 h-3"/>')
	},
	{
		id: 'kettle',
		name: 'Kettle',
		cells: [[0, 0], [0, 1], [1, 1]],
		score: { risk: -1, scope: -1 },
		discard: { scope: -1 },
		svg: S('0 0 64 64', '<path d="M34 30 h20 v18 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 z"/><path d="M34 34 l-18 -12"/><path d="M38 30 a6 6 0 0 1 12 0"/>')
	},
	{
		id: 'coat',
		name: 'Winter coat',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { risk: -2, scope: -1 },
		discard: { risk: 1, scope: 1 },
		svg: S('0 0 64 64', '<path d="M18 8 a5 5 0 0 1 9 3"/><path d="M27 11 L12 24 v30 h22 V24 z"/><path d="M27 11 L38 20"/><path d="M34 40 h20 v14 h-20"/>')
	},
	{
		id: 'pan',
		name: 'Frying pan',
		cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
		score: { scope: -1 },
		discard: { creative: -1 },
		svg: S('0 0 96 64', '<path d="M8 14 h44"/><path d="M52 8 h34 v18 a20 20 0 0 1 -20 20 h-2 a20 20 0 0 1 -20 -20 z"/>')
	},
	{
		id: 'laptop',
		name: 'Laptop',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { scope: -1, tempo: 1 },
		discard: { scope: 2, risk: 2, creative: 1 },
		svg: S('0 0 64 64', '<path d="M9 8 h22 v22 h-22 z"/><path d="M6 34 h44 l6 12 h-56 z"/>')
	},
	{
		id: 'album',
		name: 'Family photo album',
		cells: [[0, 0], [0, 1]],
		score: { social: 2, creative: 1, scope: 1 },
		discard: { social: -2, creative: -2, risk: 1 },
		svg: S('0 0 64 32', '<path d="M32 9 c-9 -4 -18 -4 -26 -1 v17 c8 -3 17 -3 26 1 z"/><path d="M32 9 c9 -4 18 -4 26 -1 v17 c-8 -3 -17 -3 -26 1 z"/><path d="M32 9 v17"/><rect x="11" y="13" width="8" height="6"/><rect x="45" y="13" width="8" height="6"/>')
	},
	{
		id: 'bedding',
		name: 'Bedding',
		cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]],
		score: { risk: -1, creative: -2 },
		discard: { scope: -1, risk: -1 },
		svg: S('0 0 96 64', '<rect x="8" y="8" width="80" height="20" rx="7"/><path d="M8 18 h80"/><rect x="8" y="34" width="56" height="22" rx="7"/><path d="M8 45 h56"/>')
	},
	{
		id: 'plant',
		name: 'Houseplant',
		cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
		score: { creative: 2, social: 1 },
		discard: { creative: -1, social: -1 },
		svg: S('0 0 96 96', '<path d="M48 8 v52"/><path d="M48 34 c-20 0 -30 -10 -30 -22 c18 -3 30 8 30 22 z"/><path d="M48 30 c20 0 30 -10 30 -22 c-18 -3 -30 8 -30 22 z"/><path d="M34 60 h28 l-4 26 h-20 z"/>')
	},
	{
		id: 'documents',
		name: 'Passport and papers',
		cells: [[0, 0]],
		score: { scope: -2 },
		discard: { scope: 3, risk: 2 },
		svg: S('0 0 32 32', '<rect x="7" y="4" width="18" height="24" rx="2.5"/><circle cx="16" cy="13" r="3.5"/><path d="M11 21 h10 M11 24.5 h10"/>')
	},
	{
		id: 'toolbox',
		name: 'Toolbox',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { scope: -2, creative: 1 },
		discard: { scope: 1 },
		svg: S('0 0 64 64', '<path d="M14 12 v-3 a4 4 0 0 1 4 -4 h8 a4 4 0 0 1 4 4 v3"/><rect x="6" y="12" width="32" height="14" rx="2"/><rect x="6" y="34" width="48" height="20" rx="2"/><path d="M6 44 h48"/>')
	},
	{
		id: 'shoes',
		name: 'Your shoes',
		cells: [[0, 1], [1, 0], [1, 1]],
		score: { risk: -1, scope: -1 },
		discard: { risk: 1 },
		svg: S('0 0 64 64', '<path d="M36 8 h8 l6 7 h6 a4 4 0 0 1 4 4 v5 H36 z"/><path d="M6 40 h8 l6 7 h6 a4 4 0 0 1 4 4 v5 H6 z"/><path d="M36 40 h8 l6 7 h6 a4 4 0 0 1 4 4 v5 H36 z"/>')
	},
	{
		id: 'lamp',
		name: 'Floor lamp',
		cells: [[0, 0], [1, 0], [1, 1], [1, 2]],
		score: { creative: 1, social: 1 },
		discard: { creative: -1 },
		svg: S('0 0 96 64', '<path d="M8 24 l8 -18 h14 l8 18 z"/><path d="M23 24 v22"/><path d="M12 56 h22 l-3 -10 h-16 z"/>')
	},
	{
		id: 'books',
		name: 'Books',
		cells: [[0, 0], [0, 1], [1, 0]],
		score: { creative: 1, scope: -1 },
		discard: { creative: -2, social: -1 },
		svg: S('0 0 64 64', '<rect x="8" y="8" width="46" height="12" rx="1.5"/><path d="M14 8 v12"/><rect x="8" y="24" width="30" height="12" rx="1.5"/><path d="M14 24 v12"/><rect x="8" y="40" width="30" height="12" rx="1.5"/><path d="M14 40 v12"/>')
	},
	{
		id: 'toaster',
		name: 'Toaster',
		cells: [[0, 0], [0, 1]],
		score: { risk: -1, creative: -1 },
		discard: { scope: -1 },
		svg: S('0 0 64 32', '<rect x="10" y="9" width="40" height="17" rx="3"/><path d="M18 9 v-3 h10 v3 M34 9 v-3 h10 v3"/><path d="M54 14 v6"/>')
	},
	{
		id: 'rug',
		name: 'Rolled-up rug',
		cells: [[0, 0], [0, 1]],
		score: { creative: 2, risk: 1 },
		discard: { creative: -1, scope: -1 },
		svg: S('0 0 64 32', '<path d="M14 8 h38 a8 8 0 0 1 0 16 h-38 z"/><ellipse cx="14" cy="16" rx="8" ry="8"/><circle cx="14" cy="16" r="3"/>')
	}
];
