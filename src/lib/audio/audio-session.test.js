import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAudioSession } from './audio-session.js';

test('opts supporting browsers into a playback audio session', () => {
	const audioSession = { type: 'auto', state: 'inactive' };
	assert.equal(configureAudioSession({ audioSession }), audioSession);
	assert.equal(audioSession.type, 'playback');
});

test('fails open when the Audio Session API is absent or read-only', () => {
	assert.equal(configureAudioSession({}), null);
	const audioSession = /** @type {{ type?: string }} */ ({});
	Object.defineProperty(audioSession, 'type', {
		set: () => {
			throw new Error('blocked');
		}
	});
	assert.equal(configureAudioSession({ audioSession }), null);
});
