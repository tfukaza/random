// Brick grids for kimeiga's "kaiski 2x3" FontStruct typeface
// (https://fontstruct.com/fontstructions/show/2898352). Every glyph lives on
// a 2-wide x 3-tall grid; rows read top to bottom, '#' is a brick. The shapes
// were extracted from the downloaded OTF (FontStruct's web renderer serves a
// stale build that is missing ten letters), so these are the font's real
// letterforms — the pieces in the game ARE the font. The full a-z and 0-9 are
// drawn; uppercase is identical to lowercase. Punctuation stays undrawn and
// is skipped in play.

/** @typedef {string[]} Grid A glyph as rows of '#' (brick) and '.' (empty). */

/** @type {Record<string, Grid>} */
export const GLYPHS = {
	a: ['.', '.', '#'],
	b: ['#.', '##', '##'],
	c: ['##', '#.', '##'],
	d: ['.#', '##', '##'],
	e: ['#', '.', '#'],
	f: ['##', '..', '#.'],
	g: ['##', '.#', '#.'],
	h: ['##', '..', '##'],
	i: ['#', '#', '#'],
	j: ['.#', '.#', '##'],
	k: ['##', '#.', '.#'],
	l: ['#.', '#.', '##'],
	m: ['##', '.#', '##'],
	n: ['.', '#', '#'],
	o: ['.', '#', '.'],
	p: ['##', '##', '#.'],
	q: ['##', '##', '.#'],
	r: ['##', '#.', '#.'],
	s: ['#.', '##', '.#'],
	t: ['#', '.', '.'],
	u: ['#', '#', '.'],
	v: ['.#', '#.', '.#'],
	w: ['.#', '#.', '##'],
	x: ['#.', '.#', '#.'],
	y: ['##', '..', '.#'],
	z: ['.#', '##', '#.'],
	0: ['##', '##', '##'],
	1: ['#.', '.#', '.#'],
	2: ['..', '#.', '##'],
	3: ['##', '.#', '..'],
	4: ['.#', '##', '.#'],
	5: ['##', '#.', '..'],
	6: ['#.', '##', '#.'],
	7: ['##', '.#', '.#'],
	8: ['..', '##', '##'],
	9: ['##', '##', '..']
};

/**
 * The glyph for a character of running text, or null if the font doesn't
 * draw it (punctuation). Case-insensitive: the font draws uppercase and
 * lowercase identically.
 * @param {string} char
 * @returns {Grid | null}
 */
export function glyphFor(char) {
	return GLYPHS[char.toLowerCase()] ?? null;
}

/** @param {Grid} grid */
export function glyphWidth(grid) {
	return grid[0].length;
}

/** @param {Grid} grid */
export function glyphHeight(grid) {
	return grid.length;
}

/**
 * Paint one glyph at (x, y) in canvas pixels, `cell` px per brick.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Grid} grid
 * @param {number} x
 * @param {number} y
 * @param {number} cell
 */
export function drawGlyph(ctx, grid, x, y, cell) {
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			if (grid[r][c] === '#') {
				ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
			}
		}
	}
}

/**
 * Typeset a run of text in kaiski glyphs starting at (x, y); characters the
 * font doesn't draw are skipped entirely (this helper is for HUD text like
 * scores, which sticks to characters the font has). Returns the advance
 * width in pixels. Letters sit one brick apart, spaces are two bricks wide.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} cell
 */
export function drawGlyphText(ctx, text, x, y, cell) {
	let cursor = x;
	for (const char of text) {
		if (char === ' ') {
			cursor += cell * 2;
			continue;
		}
		const grid = glyphFor(char);
		if (!grid) continue;
		drawGlyph(ctx, grid, cursor, y, cell);
		cursor += (glyphWidth(grid) + 1) * cell;
	}
	return cursor - x;
}

/**
 * Width of a glyph-text run without drawing it, for centering.
 * @param {string} text
 * @param {number} cell
 */
export function glyphTextWidth(text, cell) {
	let width = 0;
	for (const char of text) {
		if (char === ' ') {
			width += cell * 2;
			continue;
		}
		const grid = glyphFor(char);
		if (!grid) continue;
		width += (glyphWidth(grid) + 1) * cell;
	}
	return width;
}
