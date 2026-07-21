import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ITEMS } from './boxItems.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test('every moving-box item has a correctly sized alpha sprite', () => {
	assert.equal(ITEMS.length, 16);
	assert.equal(new Set(ITEMS.map((item) => item.sprite)).size, ITEMS.length);
	assert.equal(ITEMS.reduce((total, item) => total + item.cells.length, 0), 49);

	for (const item of ITEMS) {
		const file = readFileSync(join(process.cwd(), 'static', item.sprite));
		assert.deepEqual(file.subarray(0, 8), PNG_SIGNATURE, `${item.id} must be a PNG`);
		const rows = Math.max(...item.cells.map(([row]) => row)) + 1;
		const columns = Math.max(...item.cells.map(([, column]) => column)) + 1;
		assert.equal(file.readUInt32BE(16), columns * 128, `${item.id} width`);
		assert.equal(file.readUInt32BE(20), rows * 128, `${item.id} height`);
		assert.equal(file[25], 6, `${item.id} must use RGBA color`);
	}
});
