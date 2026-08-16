import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	COLS,
	ROWS,
	createBoard,
	annotatePassage,
	queueFromPassage,
	rotateCW,
	makePiece,
	collides,
	tryMove,
	tryRotate,
	dropRow,
	lockPiece,
	removeRows,
	scoreFor
} from './engine.js';
import { GLYPHS, glyphFor } from './glyphs.js';

test('every glyph fits the 2x3 brick grid and has at least one brick', () => {
	for (const [char, grid] of Object.entries(GLYPHS)) {
		assert.ok(grid.length <= 3, `${char} too tall`);
		for (const row of grid) {
			assert.ok(row.length <= 2, `${char} too wide`);
			assert.match(row, /^[#.]+$/, `${char} has stray characters`);
		}
		assert.ok(grid.some((row) => row.includes('#')), `${char} draws nothing`);
	}
});

test('glyph lookup is case-insensitive and h borrows capital H', () => {
	assert.deepEqual(glyphFor('A'), glyphFor('a'));
	assert.deepEqual(glyphFor('h'), ['##', '..', '##']);
	assert.equal(glyphFor('z'), null);
	assert.equal(glyphFor('!'), null);
});

test('queueFromPassage keeps only drawable characters, in order', () => {
	const queue = queueFromPassage('to be, ok?');
	assert.deepEqual(
		queue.map((entry) => entry.char),
		['t', 'o', 'b', 'e', 'o'] // comma, question mark, and 'k' are undrawn
	);
	assert.deepEqual(
		queue.map((entry) => entry.wordIndex),
		[0, 0, 1, 1, 2]
	);
});

test('annotatePassage marks undrawable characters as unplayable but keeps them', () => {
	const strip = annotatePassage('a z');
	assert.equal(strip.length, 3);
	assert.equal(strip[0].playable, true);
	assert.equal(strip[1].space, true);
	assert.equal(strip[2].playable, false);
});

test('rotateCW turns the i column into a row and returns after four turns', () => {
	const i = /** @type {string[]} */ (glyphFor('i')); // ['#','#','#']
	const once = rotateCW(i);
	assert.deepEqual(once, ['###']);
	let grid = i;
	for (let n = 0; n < 4; n++) grid = rotateCW(grid);
	assert.deepEqual(grid, i);
});

test('pieces spawn above the board, fall, and lock into the floor', () => {
	const board = createBoard();
	let piece = makePiece(queueFromPassage('i')[0]);
	assert.ok(piece.row < 0);
	piece = { ...piece, row: dropRow(board, piece) };
	assert.equal(piece.row, ROWS - 3);
	const { board: settled, clearedRows, toppedOut } = lockPiece(board, piece);
	assert.equal(clearedRows.length, 0);
	assert.equal(toppedOut, false);
	assert.equal(settled[ROWS - 1][piece.col], piece.wordIndex);
});

test('wall kick lets a rotation next to the wall succeed', () => {
	const board = createBoard();
	// A 1-wide, 3-tall piece flush against the right wall: plain CW rotation
	// would poke through, the kick shifts it left instead.
	const piece = { ...makePiece(queueFromPassage('i')[0]), row: 5, col: COLS - 1 };
	const rotated = tryRotate(board, piece);
	assert.ok(rotated);
	assert.deepEqual(rotated.grid, ['###']);
	assert.ok(rotated.col + 3 <= COLS);
});

test('tryMove refuses to cross the walls', () => {
	const board = createBoard();
	const piece = { ...makePiece(queueFromPassage('i')[0]), row: 5, col: 0 };
	assert.equal(tryMove(board, piece, 0, -1), null);
	assert.ok(tryMove(board, piece, 0, 1));
});

test('a full row clears and scores by level', () => {
	const board = createBoard();
	for (let c = 0; c < COLS - 1; c++) board[ROWS - 1][c] = 0;
	// 'a' is a single brick; drop it into the last gap.
	const piece = { ...makePiece(queueFromPassage('a')[0]), col: COLS - 1 };
	const landed = { ...piece, row: dropRow(board, piece) };
	const { board: settled, clearedRows } = lockPiece(board, landed);
	assert.deepEqual(clearedRows, [ROWS - 1]);
	const swept = removeRows(settled, clearedRows);
	assert.ok(swept[ROWS - 1].every((cell) => cell === null));
	assert.equal(swept.length, ROWS);
	assert.equal(scoreFor(clearedRows.length, 2), 200);
});

test('locking above the ceiling reports a top out', () => {
	const board = createBoard();
	board[1][4] = 0; // a stack already poking past row 1 in the spawn column
	const piece = makePiece(queueFromPassage('i')[0]); // spawns at row -3
	const dropped = { ...piece, row: dropRow(board, piece) };
	const { toppedOut } = lockPiece(board, dropped);
	assert.equal(toppedOut, true);
});

test('collides sees settled bricks but not the empty sky', () => {
	const board = createBoard();
	board[10][4] = 0;
	const grid = /** @type {string[]} */ (glyphFor('i'));
	assert.equal(collides(board, grid, -3, 4), false);
	assert.equal(collides(board, grid, 8, 4), true);
});
