import assert from 'node:assert/strict';
import test from 'node:test';
import { needsIosHtml5Audio, preserveHowlsDuringMobileUnlock } from './howler-compat.js';

test('prevents Howler mobile unlock from rebuilding the audio context', () => {
	const howler = { _mobileUnloaded: false };
	preserveHowlsDuringMobileUnlock(howler);
	assert.equal(howler._mobileUnloaded, true);
});

test('selects the HTML5 fallback for iPhones and desktop-mode iPads only', () => {
	assert.equal(needsIosHtml5Audio({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }), true);
	assert.equal(needsIosHtml5Audio({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
	assert.equal(needsIosHtml5Audio({ platform: 'MacIntel', maxTouchPoints: 0 }), false);
	assert.equal(needsIosHtml5Audio({ userAgent: 'Mozilla/5.0 (Linux; Android 15)' }), false);
});
