// The moving-box catalogue, shared by pack-box (fit what you can into one box)
// and airport-discard (throw one of them away). `cells` are [row, col] offsets
// from each shape's top-left anchor; `score` is awarded for packing the item,
// `discard` for throwing it out at the airport.
//
// ── THE SHAPES ARE AN UNSOLVABLE PUZZLE, ON PURPOSE ─────────────────────────
// These sixteen footprints total **49 cells**. The box is 6 × 8 = 48. Bringing
// everything is therefore impossible, and no amount of rearranging will fix it.
//
// This is the question's whole point, and it is a P2 test (docs/design.md): the
// tray prints each item's block count after its name, so the arithmetic is on
// screen from the first second. A taker paying attention adds it up, finds 49
// against 48 slots, and concludes there is nothing to solve — the real question
// was always "what do you leave behind". A taker who does not shuffles pieces
// for a minute and change, and the scoring reads that as exactly what it is.
//
// The set began as a genuine exact cover: it was DERIVED by partitioning the
// 6×8 grid into connected polyominoes, so all sixteen once tiled it perfectly,
// with >50,000 distinct complete packings. The rug then gained a third cell.
// Everything else is untouched, which is why it still *looks* like it ought to
// work — every piece but one is a real part of a real solution.
//
// WHAT IS AND IS NOT POSSIBLE (verified by exhaustive search, both directions):
//   • Packing all sixteen items: impossible. 49 > 48, no search required.
//   • Filling all 48 cells: POSSIBLE, but only by leaving a one-cell item —
//     the mug or the papers — behind. Both such subsets still tile. That is
//     the observant taker's reward and it is deliberate; a puzzle where perfect
//     play is also unreachable would just be spiteful.
//
// Eleven of the sixteen are NON-RECTANGULAR — L, J, S, a P-pentomino and a
// plus. Pieces cannot be rotated, so the fixed orientations below are load-
// bearing.
//
// DO NOT edit a `cells` array casually. The 49-vs-48 overrun is the design, and
// the two 48-cell subsets above must stay tileable. If you must, re-run an
// exact-cover search over every subset that sums to ROWS × COLS and confirm
// both properties before shipping.
//
// The spread that matters is practical ↔ sentimental: every item is something a
// real person owns, and roughly half are worth more than they are useful.
//
// NOTE the semantics of `discard` are INVERTED from packing. Choosing to bring
// your family album is not the same act as throwing it in an airport bin.

/** @param {string} id */
const sprite = (id) => `/images/box-items/${id}.png`;

export const ITEMS = [
	{
		id: 'guitar',
		name: 'Guitar',
		cells: [[0, 0], [1, 0], [1, 1], [1, 2]],
		score: { creative: 3, risk: 1, scope: 1 },
		discard: { creative: -2, social: -1 },
		sprite: sprite('guitar')
	},
	{
		id: 'mug',
		name: 'Your mug',
		cells: [[0, 0]],
		score: { social: -1, creative: 1 },
		discard: { scope: -2, creative: -1 },
		sprite: sprite('mug')
	},
	{
		id: 'kettle',
		name: 'Kettle',
		cells: [[0, 0], [0, 1], [1, 1]],
		score: { risk: -1, scope: -1 },
		discard: { scope: -1 },
		sprite: sprite('kettle')
	},
	{
		id: 'coat',
		name: 'Winter coat',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { risk: -2, scope: -1 },
		discard: { risk: 1, scope: 1 },
		sprite: sprite('coat')
	},
	{
		id: 'pan',
		name: 'Frying pan',
		cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
		score: { scope: -1 },
		discard: { creative: -1 },
		sprite: sprite('pan')
	},
	{
		id: 'laptop',
		name: 'Laptop',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { scope: -1, tempo: 1 },
		discard: { scope: 2, risk: 2, creative: 1 },
		sprite: sprite('laptop')
	},
	{
		id: 'album',
		name: 'Family photo album',
		cells: [[0, 0], [0, 1]],
		score: { social: 2, creative: 1, scope: 1 },
		discard: { social: -2, creative: -2, risk: 1 },
		sprite: sprite('album')
	},
	{
		id: 'bedding',
		name: 'Bedding',
		cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]],
		score: { risk: -1, creative: -2 },
		discard: { scope: -1, risk: -1 },
		sprite: sprite('bedding')
	},
	{
		id: 'plant',
		name: 'Houseplant',
		cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
		score: { creative: 2, social: 1 },
		discard: { creative: -1, social: -1 },
		sprite: sprite('plant')
	},
	{
		id: 'documents',
		name: 'Passport and papers',
		cells: [[0, 0]],
		score: { scope: -2 },
		discard: { scope: 3, risk: 2 },
		sprite: sprite('documents')
	},
	{
		id: 'toolbox',
		name: 'Toolbox',
		cells: [[0, 0], [1, 0], [1, 1]],
		score: { scope: -2, creative: 1 },
		discard: { scope: 1 },
		sprite: sprite('toolbox')
	},
	{
		id: 'shoes',
		name: 'Your shoes',
		cells: [[0, 1], [1, 0], [1, 1]],
		score: { risk: -1, scope: -1 },
		discard: { risk: 1 },
		sprite: sprite('shoes')
	},
	{
		id: 'lamp',
		name: 'Floor lamp',
		cells: [[0, 0], [1, 0], [1, 1], [1, 2]],
		score: { creative: 1, social: 1 },
		discard: { creative: -1 },
		sprite: sprite('lamp')
	},
	{
		id: 'books',
		name: 'Books',
		cells: [[0, 0], [0, 1], [1, 0]],
		score: { creative: 1, scope: -1 },
		discard: { creative: -2, social: -1 },
		sprite: sprite('books')
	},
	{
		id: 'toaster',
		name: 'Toaster',
		cells: [[0, 0], [0, 1]],
		score: { risk: -1, creative: -1 },
		discard: { scope: -1 },
		sprite: sprite('toaster')
	},
	{
		id: 'rug',
		// THE EXTRA BLOCK LIVES HERE. Three cells, not two — a rolled rug being
		// long is the least suspicious place to hide the cell that makes the
		// catalogue overrun the box. See the header.
		name: 'Rolled-up rug',
		cells: [[0, 0], [0, 1], [0, 2]],
		score: { creative: 2, risk: 1 },
		discard: { creative: -1, scope: -1 },
		sprite: sprite('rug')
	}
];
