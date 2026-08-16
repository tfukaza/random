// Pure game logic for kaiski tetris — no canvas, no timers, so the whole
// thing runs under node:test. The page owns the clock and the pixels.
import { glyphFor, glyphWidth, glyphHeight } from './glyphs.js';

/** @typedef {import('./glyphs.js').Grid} Grid */
/** @typedef {(number | null)[][]} Board Cells hold the settled piece's wordIndex, or null. */
/** @typedef {{char: string, playable: boolean, space: boolean, wordIndex: number | null}} StripEntry */
/** @typedef {{char: string, wordIndex: number, stripIndex: number}} QueueEntry */
/** @typedef {QueueEntry & {grid: Grid, row: number, col: number}} Piece */

export const COLS = 10;
export const ROWS = 20;

export const LINE_SCORES = [0, 100, 300, 500, 800];

/** @returns {Board} */
export function createBoard() {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/**
 * The passage annotated per character for the strip display: `playable`
 * characters become pieces, the rest (spaces, punctuation, letters the font
 * doesn't draw) only appear struck-through in the strip.
 * @param {string} passage
 * @returns {StripEntry[]}
 */
export function annotatePassage(passage) {
	const chars = [...passage];
	let wordIndex = 0;
	let sawWordChar = false;
	return chars.map((char) => {
		if (/\s/.test(char)) {
			if (sawWordChar) wordIndex++;
			sawWordChar = false;
			return { char, playable: false, space: true, wordIndex: null };
		}
		sawWordChar = true;
		return { char, playable: glyphFor(char) !== null, space: false, wordIndex };
	});
}

/**
 * The piece queue: one entry per playable character, in reading order.
 * `stripIndex` points back into annotatePassage's array for the strip cursor.
 * @param {string} passage
 * @returns {QueueEntry[]}
 */
export function queueFromPassage(passage) {
	return annotatePassage(passage)
		.map((entry, stripIndex) => ({ ...entry, stripIndex }))
		.filter((entry) => entry.playable)
		.map(({ char, wordIndex, stripIndex }) => ({
			char,
			wordIndex: /** @type {number} */ (wordIndex),
			stripIndex
		}));
}

/** @param {Grid} grid */
export function cellsOf(grid) {
	const cells = [];
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			if (grid[r][c] === '#') cells.push({ r, c });
		}
	}
	return cells;
}

/**
 * Clockwise rotation: cell (r, c) -> (c, rows - 1 - r).
 * @param {Grid} grid
 * @returns {Grid}
 */
export function rotateCW(grid) {
	const rows = grid.length;
	const cols = grid[0].length;
	const rotated = [];
	for (let r = 0; r < cols; r++) {
		let row = '';
		for (let c = 0; c < rows; c++) {
			row += grid[rows - 1 - c][r];
		}
		rotated.push(row);
	}
	return rotated;
}

/**
 * @param {QueueEntry} queueEntry
 * @returns {Piece}
 */
export function makePiece(queueEntry) {
	const grid = /** @type {Grid} */ (glyphFor(queueEntry.char));
	return {
		...queueEntry,
		grid,
		row: -glyphHeight(grid), // spawns fully above the visible board
		col: Math.floor((COLS - glyphWidth(grid)) / 2)
	};
}

/**
 * Cells above the visible board (r < 0) are legal and empty; walls, the
 * floor, and settled bricks are not.
 * @param {Board} board
 * @param {Grid} grid
 * @param {number} row
 * @param {number} col
 */
export function collides(board, grid, row, col) {
	for (const cell of cellsOf(grid)) {
		const r = row + cell.r;
		const c = col + cell.c;
		if (c < 0 || c >= COLS || r >= ROWS) return true;
		if (r >= 0 && board[r][c] !== null) return true;
	}
	return false;
}

/**
 * @param {Board} board
 * @param {Piece} piece
 * @param {number} dRow
 * @param {number} dCol
 * @returns {Piece | null}
 */
export function tryMove(board, piece, dRow, dCol) {
	if (collides(board, piece.grid, piece.row + dRow, piece.col + dCol)) return null;
	return { ...piece, row: piece.row + dRow, col: piece.col + dCol };
}

/**
 * Rotate clockwise with simple wall kicks: in place first, then nudged up to
 * two columns either way (a 1-wide glyph turning 3-wide at the wall needs 2).
 * @param {Board} board
 * @param {Piece} piece
 * @returns {Piece | null}
 */
export function tryRotate(board, piece) {
	const grid = rotateCW(piece.grid);
	for (const kick of [0, -1, 1, -2, 2]) {
		if (!collides(board, grid, piece.row, piece.col + kick)) {
			return { ...piece, grid, col: piece.col + kick };
		}
	}
	return null;
}

/**
 * @param {Board} board
 * @param {Piece} piece
 */
export function dropRow(board, piece) {
	let row = piece.row;
	while (!collides(board, piece.grid, row + 1, piece.col)) row++;
	return row;
}

/**
 * Settle a piece into the board. Returns the new board, the rows that
 * cleared, and whether the piece locked partly above the ceiling (top out).
 * @param {Board} board
 * @param {Piece} piece
 */
export function lockPiece(board, piece) {
	const next = board.map((row) => [...row]);
	let toppedOut = false;
	for (const cell of cellsOf(piece.grid)) {
		const r = piece.row + cell.r;
		const c = piece.col + cell.c;
		if (r < 0) {
			toppedOut = true;
			continue;
		}
		next[r][c] = piece.wordIndex;
	}
	const clearedRows = [];
	for (let r = 0; r < ROWS; r++) {
		if (next[r].every((cell) => cell !== null)) clearedRows.push(r);
	}
	return { board: next, clearedRows, toppedOut };
}

/**
 * @param {Board} board
 * @param {number[]} rows
 * @returns {Board}
 */
export function removeRows(board, rows) {
	const kept = board.filter((_, r) => !rows.includes(r));
	while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
	return kept;
}

/**
 * @param {number} clearedCount
 * @param {number} levelNumber
 */
export function scoreFor(clearedCount, levelNumber) {
	return LINE_SCORES[clearedCount] * levelNumber;
}
