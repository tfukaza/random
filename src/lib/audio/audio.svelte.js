import {
	musicVolume,
	normalizeMusicRate,
	normalizeSfxRate,
	normalizeSfxVolume,
	scheduleMusicRate
} from './mix.js';
import { configureAudioSession } from './audio-session.js';

const MUSIC = {
	default: { path: '/audio/music/puzzle-chamber-loop.mp3', loop: true, rateSensitive: true },
	asteroid: { path: '/audio/music/asteroid-countdown.mp3', loop: false, rateSensitive: false },
	report: { path: '/audio/music/final-report-loop.mp3', loop: true, rateSensitive: false }
};

const SFX = {
	'ui-tap': '/audio/sfx/ui-tap.mp3',
	'ui-toggle': '/audio/sfx/ui-toggle.mp3',
	'ui-confirm': '/audio/sfx/ui-confirm.mp3',
	'slider-detent': '/audio/sfx/slider-detent.mp3',
	'drag-pickup': '/audio/sfx/drag-pickup.mp3',
	'drop-valid': '/audio/sfx/drop-valid.mp3',
	'drop-invalid': '/audio/sfx/drop-invalid.mp3',
	'page-turn': '/audio/sfx/page-turn.mp3',
	'chat-send': '/audio/sfx/chat-send.mp3',
	'illusion-reveal': '/audio/sfx/illusion-reveal.mp3',
	'balance-settle': '/audio/sfx/balance-settle.mp3',
	'elevator-button': '/audio/sfx/elevator-button.mp3',
	'elevator-approach': '/audio/sfx/elevator-approach.mp3',
	'elevator-open': '/audio/sfx/elevator-open.mp3',
	'elevator-shut': '/audio/sfx/elevator-shut.mp3',
	'asteroid-warning': '/audio/sfx/asteroid-warning.mp3',
	'asteroid-approach': '/audio/sfx/asteroid-approach.mp3',
	'asteroid-impact': '/audio/sfx/asteroid-impact.mp3',
	'result-reveal': '/audio/sfx/result-reveal.mp3'
};

const STORAGE_KEY = 'personality-quiz-sound';
const CORE = ['ui-tap', 'ui-toggle', 'ui-confirm', 'slider-detent', 'drag-pickup', 'drop-valid'];
const MUSIC_FADE_SECONDS = 0.14;
const MUSIC_RATE_GLIDE_SECONDS = 1;

export const audioState = $state({
	enabled: true,
	started: false,
	ready: false,
	rate: 1,
	/** The source that is audibly running; empty while loading/switching. */
	musicTrack: '',
	/** A permanent network/decode failure, not an autoplay block. */
	musicFailed: false
});

/** @type {AudioContext | null} */
let context = null;
/** @type {GainNode | null} */
let masterGain = null;
/** @type {GainNode | null} */
let musicBus = null;
/** @type {GainNode | null} */
let sfxBus = null;
/** @type {DynamicsCompressorNode | null} */
let musicLimiter = null;
/** @type {Map<string, AudioBuffer>} */
const buffers = new Map();
/** @type {Map<string, Promise<AudioBuffer | null>>} */
const pendingLoads = new Map();
const duckRequests = new Map();
/** @type {Map<string, { token: object, source: AudioBufferSourceNode | null }>} */
const taggedSounds = new Map();

let hydrated = false;
let preloadScheduled = false;
let sessionListening = false;
/** @type {keyof typeof MUSIC} */
let desiredMusicTrack = 'default';
/** @type {keyof typeof MUSIC | ''} */
let completedMusicTrack = '';
/** @type {{ track: keyof typeof MUSIC, source: AudioBufferSourceNode, gain: GainNode } | null} */
let activeMusic = null;
let musicSwitchToken = 0;

/** @param {...unknown} args */
function warn(...args) {
	if (import.meta.env.DEV) console.warn(...args);
}

/** Safari uses this state in addition to the standard AudioContextState values. */
function contextIsRunning() {
	return context?.state === 'running';
}

function resetClosedContext() {
	if (context?.state !== 'closed') return;
	context = null;
	masterGain = null;
	musicBus = null;
	sfxBus = null;
	musicLimiter = null;
	activeMusic = null;
	audioState.musicTrack = '';
	audioState.ready = false;
}

function configurePlatformAudio() {
	if (typeof navigator === 'undefined') return;
	const session = configureAudioSession(/** @type {any} */ (navigator));
	if (!session || sessionListening || typeof session.addEventListener !== 'function') return;
	sessionListening = true;
	session.addEventListener('statechange', () => {
		if (session.state === 'active') resumeAudio();
	});
}

function ensureContext() {
	if (typeof window === 'undefined') return null;
	resetClosedContext();
	if (context) return context;

	configurePlatformAudio();
	const Context = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
	if (!Context) return null;
	context = new Context();
	masterGain = context.createGain();
	musicBus = context.createGain();
	sfxBus = context.createGain();
	musicLimiter = context.createDynamicsCompressor();

	musicLimiter.threshold.value = -3;
	musicLimiter.knee.value = 1;
	musicLimiter.ratio.value = 20;
	musicLimiter.attack.value = 0.003;
	musicLimiter.release.value = 0.12;
	masterGain.gain.value = audioState.enabled ? 1 : 0;
	musicBus.gain.value = 1;
	sfxBus.gain.value = 1;
	musicBus.connect(musicLimiter);
	musicLimiter.connect(masterGain);
	sfxBus.connect(masterGain);
	masterGain.connect(context.destination);
	return context;
}

/** @param {AudioContext} ctx */
async function resumeContext(ctx) {
	if (ctx.state === 'running') return true;
	try {
		await ctx.resume();
		return /** @type {string} */ (ctx.state) === 'running';
	} catch (error) {
		warn('Audio resume failed', error);
		return false;
	}
}

/** @param {string} id */
async function loadBuffer(id) {
	const cached = buffers.get(id);
	if (cached) return cached;
	const pending = pendingLoads.get(id);
	if (pending) return pending;
	const ctx = ensureContext();
	if (!ctx) return null;
	const musicId = id.startsWith('music:') ? id.slice(6) : '';
	const asset = musicId
		? MUSIC[/** @type {keyof typeof MUSIC} */ (musicId)]?.path
		: SFX[/** @type {keyof typeof SFX} */ (id)];
	if (!asset) return null;

	const request = fetch(asset)
		.then((response) => {
			if (!response.ok) throw new Error(`Audio load failed: ${asset}`);
			return response.arrayBuffer();
		})
		.then((data) => ctx.decodeAudioData(data))
		.then((buffer) => {
			buffers.set(id, buffer);
			return buffer;
		})
		.catch((error) => {
			warn(error);
			return null;
		})
		.finally(() => pendingLoads.delete(id));
	pendingLoads.set(id, request);
	return request;
}

function schedulePreload() {
	if (preloadScheduled || typeof window === 'undefined') return;
	preloadScheduled = true;
	const preload = () => {
		for (const id of Object.keys(SFX)) void loadBuffer(id);
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(preload);
	else setTimeout(preload, 500);
}

function effectiveDuck() {
	return Math.min(1, ...duckRequests.values());
}

/** @param {keyof typeof MUSIC} track */
function selectedMusicVolume(track) {
	return musicVolume(track, audioState.rate, effectiveDuck());
}

/** @param {number} [duration] */
function updateMusicVolume(duration = 0.12) {
	if (!context || !activeMusic || activeMusic.track !== desiredMusicTrack) return;
	const param = activeMusic.gain.gain;
	const now = context.currentTime;
	const target = selectedMusicVolume(activeMusic.track);
	param.cancelScheduledValues(now);
	param.setValueAtTime(param.value, now);
	if (duration <= 0) param.setValueAtTime(target, now);
	else param.setTargetAtTime(target, now, Math.max(0.01, duration / 5));
}

/** @param {AudioBufferSourceNode} source */
function stopSource(source) {
	try {
		source.stop();
	} catch {
		// A finite cue may have ended between the state check and this call.
	}
}

/** @param {{ source: AudioBufferSourceNode, gain: GainNode }} music */
function fadeAndStop(music) {
	if (!context) return stopSource(music.source);
	const now = context.currentTime;
	music.gain.gain.cancelScheduledValues(now);
	music.gain.gain.setValueAtTime(music.gain.gain.value, now);
	music.gain.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_SECONDS);
	setTimeout(() => stopSource(music.source), MUSIC_FADE_SECONDS * 1000 + 20);
}

/**
 * @param {keyof typeof MUSIC} track
 * @param {boolean} restart
 */
async function switchMusic(track, restart) {
	const token = ++musicSwitchToken;
	const buffer = await loadBuffer(`music:${track}`);
	if (
		token !== musicSwitchToken ||
		desiredMusicTrack !== track ||
		!audioState.enabled ||
		!audioState.started
	)
		return;
	if (!buffer) {
		audioState.musicFailed = true;
		audioState.ready = false;
		return;
	}
	const ctx = ensureContext();
	if (!ctx || !musicBus) return;

	if (activeMusic?.track === track && !restart) {
		if (MUSIC[track].rateSensitive)
			scheduleMusicRate(activeMusic.source.playbackRate, audioState.rate, ctx.currentTime, 0);
		updateMusicVolume(0);
		return;
	}
	if (completedMusicTrack === track && !restart) return;

	const previous = activeMusic;
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	source.buffer = buffer;
	source.loop = MUSIC[track].loop;
	source.playbackRate.value = MUSIC[track].rateSensitive ? audioState.rate : 1;
	gain.gain.value = 0;
	source.connect(gain);
	gain.connect(musicBus);

	const music = { track, source, gain };
	activeMusic = music;
	completedMusicTrack = '';
	audioState.musicTrack = track;
	audioState.musicFailed = false;
	audioState.ready = true;
	source.onended = () => {
		if (activeMusic === music) {
			activeMusic = null;
			completedMusicTrack = track;
			audioState.musicTrack = '';
			audioState.ready = false;
		}
		source.disconnect();
		gain.disconnect();
	};
	source.start();

	const now = ctx.currentTime;
	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(selectedMusicVolume(track), now + MUSIC_FADE_SECONDS);
	if (previous) fadeAndStop(previous);
}

function ensureSelectedMusic() {
	if (
		activeMusic?.track === desiredMusicTrack ||
		completedMusicTrack === desiredMusicTrack ||
		!audioState.enabled ||
		!audioState.started
	)
		return;
	void switchMusic(desiredMusicTrack, false);
}

export function hydrateAudioPreference() {
	if (hydrated || typeof localStorage === 'undefined') return;
	hydrated = true;
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === 'off') audioState.enabled = false;
	else if (saved === 'on') audioState.enabled = true;
}

export function startAudio() {
	audioState.started = true;
	if (!audioState.enabled) return;
	const ctx = ensureContext();
	if (!ctx || !masterGain) {
		audioState.musicFailed = true;
		return;
	}
	const now = ctx.currentTime;
	masterGain.gain.cancelScheduledValues(now);
	masterGain.gain.setTargetAtTime(1, now, 0.04);
	void resumeContext(ctx).then((running) => {
		if (running) ensureSelectedMusic();
	});
	for (const id of CORE) void loadBuffer(id);
	schedulePreload();
}

/** @param {boolean} enabled */
export function setAudioEnabled(enabled) {
	audioState.enabled = enabled;
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
	if (enabled && audioState.started) {
		startAudio();
		return;
	}
	if (!context || !masterGain) return;
	const now = context.currentTime;
	masterGain.gain.cancelScheduledValues(now);
	masterGain.gain.setTargetAtTime(0, now, 0.025);
}

/** @param {number} rate */
export function setMusicRate(rate) {
	const next = normalizeMusicRate(rate);
	audioState.rate = next;
	if (!context || !activeMusic || !MUSIC[activeMusic.track].rateSensitive) return;
	scheduleMusicRate(
		activeMusic.source.playbackRate,
		next,
		context.currentTime,
		MUSIC_RATE_GLIDE_SECONDS
	);
	updateMusicVolume(0.2);
}

/**
 * @param {keyof typeof MUSIC} id
 * @param {{ restart?: boolean }} [options]
 */
export async function setMusicTrack(id, { restart = false } = {}) {
	if (!MUSIC[id]) return;
	desiredMusicTrack = id;
	completedMusicTrack = '';
	audioState.musicFailed = false;
	if (audioState.musicTrack !== id) {
		audioState.musicTrack = '';
		audioState.ready = false;
	}
	// Remember deep-linked scenes without creating an AudioContext before the
	// first gesture. The next pointer/key event starts the selected cue.
	if (!audioState.enabled || !audioState.started) return;
	const ctx = ensureContext();
	if (!ctx) {
		audioState.musicFailed = true;
		return;
	}
	if (!(await resumeContext(ctx))) return;
	await switchMusic(id, restart);
}

/** Stop the selected score without allowing visibility recovery to restart it. */
export function stopMusic() {
	musicSwitchToken += 1;
	completedMusicTrack = desiredMusicTrack;
	const previous = activeMusic;
	activeMusic = null;
	audioState.musicTrack = '';
	audioState.ready = false;
	if (previous) stopSource(previous.source);
}

/** @param {string} key @param {number} amount */
export function duckMusic(key, amount) {
	duckRequests.set(key, Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 1);
	updateMusicVolume();
}

/** @param {string} key */
export function clearMusicDuck(key) {
	duckRequests.delete(key);
	updateMusicVolume();
}

/**
 * @param {keyof typeof SFX} id
 * @param {{ volume?: number, rate?: number, tag?: string }} [options]
 * @returns {Promise<AudioBufferSourceNode | null>}
 */
export async function playSfx(id, options = {}) {
	if (!audioState.enabled || !audioState.started) return null;
	const ctx = ensureContext();
	if (!ctx || !sfxBus) return null;
	const token = {};
	if (options.tag) {
		stopSfx(options.tag);
		taggedSounds.set(options.tag, { token, source: null });
	}
	if (!(await resumeContext(ctx))) {
		if (options.tag && taggedSounds.get(options.tag)?.token === token)
			taggedSounds.delete(options.tag);
		return null;
	}
	const buffer = await loadBuffer(id);
	if (!buffer || !audioState.enabled || !contextIsRunning()) {
		if (options.tag && taggedSounds.get(options.tag)?.token === token)
			taggedSounds.delete(options.tag);
		return null;
	}
	if (options.tag && taggedSounds.get(options.tag)?.token !== token) return null;

	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	source.buffer = buffer;
	source.playbackRate.value = normalizeSfxRate(options.rate);
	gain.gain.value = normalizeSfxVolume(options.volume);
	source.connect(gain);
	gain.connect(sfxBus);
	if (options.tag) taggedSounds.set(options.tag, { token, source });
	source.onended = () => {
		if (options.tag && taggedSounds.get(options.tag)?.source === source)
			taggedSounds.delete(options.tag);
		source.disconnect();
		gain.disconnect();
	};
	source.start();
	return source;
}

/** A tiny procedural timing cue for the 1,500 WPM reader. */
export function playReaderTick() {
	if (!audioState.enabled || !audioState.started) return;
	const ctx = ensureContext();
	if (!ctx || !sfxBus || !contextIsRunning()) return;
	const now = ctx.currentTime;
	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	oscillator.type = 'sine';
	oscillator.frequency.value = 880;
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.036, now + 0.002);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
	oscillator.connect(gain);
	gain.connect(sfxBus);
	oscillator.start(now);
	oscillator.stop(now + 0.02);
	oscillator.onended = () => {
		oscillator.disconnect();
		gain.disconnect();
	};
}

/** @param {string} tag */
export function stopSfx(tag) {
	const active = taggedSounds.get(tag);
	taggedSounds.delete(tag);
	if (active?.source) stopSource(active.source);
}

export function suspendAudio() {
	if (context?.state === 'running')
		void context.suspend().catch((error) => warn('Audio suspend failed', error));
}

export function resumeAudio() {
	if (!audioState.enabled || !audioState.started) return;
	const ctx = ensureContext();
	if (!ctx || !masterGain) {
		audioState.musicFailed = true;
		return;
	}
	const now = ctx.currentTime;
	masterGain.gain.cancelScheduledValues(now);
	masterGain.gain.setTargetAtTime(1, now, 0.04);
	void resumeContext(ctx).then((running) => {
		if (running) ensureSelectedMusic();
	});
}
