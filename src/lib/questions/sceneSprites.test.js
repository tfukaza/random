import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PROPS } from './sceneModel.js';
import { PROP_SPRITES, SCENE_BASE, SCENE_MASTER } from './sceneSprites.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** @param {string} path */
function png(path) {
	const file = readFileSync(join(process.cwd(), 'static', path));
	assert.deepEqual(file.subarray(0, 8), PNG_SIGNATURE, `${path} must be a PNG`);
	return file;
}

test('the scene plates share one exact aspect and every prop has an alpha cutout', () => {
	for (const plate of [SCENE_BASE, SCENE_MASTER]) {
		const file = png(plate);
		assert.equal(file.readUInt32BE(16), 1400, `${plate} width`);
		assert.equal(file.readUInt32BE(20), 1120, `${plate} height`);
	}

	assert.deepEqual(Object.keys(PROP_SPRITES).sort(), PROPS.map((prop) => prop.id).sort());
	for (const [id, path] of Object.entries(PROP_SPRITES)) {
		const file = png(path);
		assert.equal(file[25], 6, `${id} must use RGBA color`);
		assert.ok(file.readUInt32BE(16) >= 100, `${id} is unexpectedly narrow`);
		assert.ok(file.readUInt32BE(20) >= 100, `${id} is unexpectedly short`);
	}
});
