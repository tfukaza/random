import { Howl, Howler } from 'howler';
import {
	musicVolume,
	normalizeMusicRate,
	normalizeSfxRate,
	normalizeSfxVolume
} from './mix.js';

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
const MUSIC_FADE_MS = 140;

export const audioState = $state({
	enabled: true,
	started: false,
	ready: false,
	rate: 1,
	/** The source that is audibly running; empty while loading/switching. */
	musicTrack: '',
	/** A permanent load/decode failure, not an autoplay block. */
	musicFailed: false
});

/** @type {Map<keyof typeof MUSIC, Howl>} */
const musicHowls = new Map();
/** @type {Map<keyof typeof SFX, Howl>} */
const sfxHowls = new Map();
/** @type {WeakMap<Howl, Promise<boolean>>} */
const loadPromises = new WeakMap();
const duckRequests = new Map();
/** @type {Map<string, { token: object, howl: Howl, id: number }>} */
const taggedSounds = new Map();
/** Sound IDs stopped before a delayed mobile-unlock retry could run. */
const canceledSoundIds = new Set();

let initialized = false;
let hydrated = false;
let preloadScheduled = false;
/** @type {keyof typeof MUSIC} */
let desiredMusicTrack = 'default';
/** @type {{ track: keyof typeof MUSIC, howl: Howl, id: number } | null} */
let activeMusic = null;
/** @type {keyof typeof MUSIC | ''} */
let completedMusicTrack = '';
let musicSwitchToken = 0;
let htmlMusicPaused = false;
/** @type {Set<string>} */
const htmlTagsPaused = new Set();

/** @param {...unknown} args */
function warn(...args) {
	if (import.meta.env.DEV) console.warn(...args);
}

function ensureInitialized() {
	if (initialized || typeof window === 'undefined') return initialized;
	initialized = true;
	Howler.autoUnlock = true;
	Howler.autoSuspend = true;

	for (const [track, config] of Object.entries(MUSIC)) {
		/** @type {Howl} */
		let howl;
		howl = new Howl({
			src: [config.path],
			format: ['mp3'],
			loop: config.loop,
			preload: false,
			pool: 1,
			onplay: (id) => {
				if (activeMusic?.howl !== howl || activeMusic.id !== id || desiredMusicTrack !== track)
					return;
				audioState.musicTrack = track;
				audioState.musicFailed = false;
				audioState.ready = true;
			},
			onend: (id) => {
				if (activeMusic?.howl !== howl || activeMusic.id !== id) return;
				activeMusic = null;
				completedMusicTrack = /** @type {keyof typeof MUSIC} */ (track);
				if (audioState.musicTrack === track) audioState.musicTrack = '';
			},
			onloaderror: (_id, error) => {
				warn(`Audio load failed: ${config.path}`, error);
				if (desiredMusicTrack !== track) return;
				audioState.musicFailed = true;
				audioState.ready = false;
				audioState.musicTrack = '';
			},
			onplayerror: (id, error) => {
				warn(`Audio playback is waiting for browser unlock: ${config.path}`, error);
				howl.once('unlock', () => {
					if (
						audioState.enabled &&
						audioState.started &&
						desiredMusicTrack === track &&
						activeMusic?.howl === howl &&
						activeMusic.id === id
					)
						howl.play(id);
				});
			}
		});
		musicHowls.set(/** @type {keyof typeof MUSIC} */ (track), howl);
	}

	for (const [name, path] of Object.entries(SFX)) {
		/** @type {Howl} */
		let howl;
		howl = new Howl({
			src: [path],
			format: ['mp3'],
			preload: false,
			pool: 8,
			onloaderror: (_id, error) => warn(`Audio load failed: ${path}`, error),
			onplayerror: (id, error) => {
				warn(`Audio playback is waiting for browser unlock: ${path}`, error);
				howl.once('unlock', () => {
					if (!canceledSoundIds.delete(id) && audioState.enabled && audioState.started)
						howl.play(id);
				});
			}
		});
		sfxHowls.set(/** @type {keyof typeof SFX} */ (name), howl);
	}

	void loadHowl(musicHowls.get(desiredMusicTrack));
	for (const id of CORE) void loadHowl(sfxHowls.get(/** @type {keyof typeof SFX} */ (id)));
	return true;
}

/** @param {Howl | undefined} howl */
function loadHowl(howl) {
	if (!howl) return Promise.resolve(false);
	if (howl.state() === 'loaded') return Promise.resolve(true);
	const existing = loadPromises.get(howl);
	if (existing) return existing;
	const promise = new Promise((resolve) => {
		const done = (/** @type {boolean} */ loaded) => {
			howl.off('load', loadedHandler);
			howl.off('loaderror', errorHandler);
			loadPromises.delete(howl);
			resolve(loaded);
		};
		const loadedHandler = () => done(true);
		const errorHandler = () => done(false);
		howl.once('load', loadedHandler);
		howl.once('loaderror', errorHandler);
		if (howl.state() === 'unloaded') howl.load();
	});
	loadPromises.set(howl, promise);
	return promise;
}

function schedulePreload() {
	if (preloadScheduled || typeof window === 'undefined') return;
	preloadScheduled = true;
	const preload = () => {
		for (const howl of musicHowls.values()) void loadHowl(howl);
		for (const howl of sfxHowls.values()) void loadHowl(howl);
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(preload);
	else setTimeout(preload, 500);
}

function effectiveDuck() {
	return Math.min(1, ...duckRequests.values());
}

function selectedMusicVolume() {
	return musicVolume(desiredMusicTrack, audioState.rate, effectiveDuck());
}

/** @param {number} [duration] */
function updateMusicVolume(duration = 120) {
	if (!activeMusic || activeMusic.track !== desiredMusicTrack) return;
	const target = selectedMusicVolume();
	const current = Number(activeMusic.howl.volume(activeMusic.id));
	if (!activeMusic.howl.playing(activeMusic.id) || duration <= 0 || !Number.isFinite(current)) {
		activeMusic.howl.volume(target, activeMusic.id);
		return;
	}
	activeMusic.howl.fade(current, target, duration, activeMusic.id);
}

/**
 * @param {keyof typeof MUSIC} track
 * @param {boolean} restart
 */
async function switchMusic(track, restart) {
	if (!ensureInitialized()) return;
	const token = ++musicSwitchToken;
	const howl = musicHowls.get(track);
	if (!howl) return;
	const loaded = await loadHowl(howl);
	if (token !== musicSwitchToken || desiredMusicTrack !== track) return;
	if (!loaded) {
		audioState.musicFailed = true;
		return;
	}
	if (!audioState.enabled || !audioState.started) return;

	if (activeMusic?.track === track && !restart) {
		if (!activeMusic.howl.playing(activeMusic.id)) activeMusic.howl.play(activeMusic.id);
		updateMusicVolume(0);
		return;
	}
	if (completedMusicTrack === track && !restart) return;

	const previous = activeMusic;
	activeMusic = null;
	audioState.musicTrack = '';
	audioState.ready = false;
	if (previous) {
		const from = Number(previous.howl.volume(previous.id));
		if (previous.howl.playing(previous.id) && Number.isFinite(from))
			previous.howl.fade(from, 0, MUSIC_FADE_MS, previous.id);
		await new Promise((resolve) => setTimeout(resolve, MUSIC_FADE_MS));
		previous.howl.stop(previous.id);
	}
	if (
		token !== musicSwitchToken ||
		desiredMusicTrack !== track ||
		!audioState.enabled ||
		!audioState.started
	)
		return;

	completedMusicTrack = '';
	const volume = selectedMusicVolume();
	const rate = MUSIC[track].rateSensitive
		? normalizeMusicRate(audioState.rate, Howler.usingWebAudio)
		: 1;
	howl.volume(volume);
	howl.rate(rate);
	const id = howl.play();
	activeMusic = { track, howl, id };
	howl.volume(volume, id);
	howl.rate(rate, id);
}

export function hydrateAudioPreference() {
	if (!hydrated && typeof localStorage !== 'undefined') {
		hydrated = true;
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === 'off') audioState.enabled = false;
		else if (saved === 'on') audioState.enabled = true;
	}
	ensureInitialized();
}

export function startAudio() {
	audioState.started = true;
	if (!ensureInitialized() || !audioState.enabled) return;
	Howler.mute(false);
	void switchMusic(desiredMusicTrack, false);
	resumeAudio();
	schedulePreload();
}

/** @param {boolean} enabled */
export function setAudioEnabled(enabled) {
	audioState.enabled = enabled;
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
	if (!ensureInitialized()) return;
	Howler.mute(!enabled);
	if (enabled && audioState.started) {
		startAudio();
	}
}

/** @param {number} rate */
export function setMusicRate(rate) {
	const next = normalizeMusicRate(rate, true);
	audioState.rate = next;
	if (!activeMusic || !MUSIC[activeMusic.track].rateSensitive) return;
	activeMusic.howl.rate(normalizeMusicRate(next, Howler.usingWebAudio), activeMusic.id);
	updateMusicVolume(200);
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
	if (!ensureInitialized()) return;
	if (!audioState.enabled || !audioState.started) {
		const loaded = await loadHowl(musicHowls.get(id));
		if (!loaded && desiredMusicTrack === id) audioState.musicFailed = true;
		return;
	}
	await switchMusic(id, restart);
}

/**
 * Stop the selected score without choosing a replacement. Marking it complete
 * prevents gesture and visibility recovery from restarting it; a later
 * `setMusicTrack` call explicitly begins the next scene's music.
 */
export function stopMusic() {
	musicSwitchToken += 1;
	completedMusicTrack = desiredMusicTrack;
	const previous = activeMusic;
	activeMusic = null;
	audioState.musicTrack = '';
	audioState.ready = false;
	if (previous) previous.howl.stop(previous.id);
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
 * @returns {Promise<number | null>}
 */
export async function playSfx(id, options = {}) {
	if (!audioState.enabled || !audioState.started || !ensureInitialized()) return null;
	const howl = sfxHowls.get(id);
	if (!howl) return null;
	const token = {};
	if (options.tag) stopSfx(options.tag);
	const soundId = howl.play();
	howl.volume(normalizeSfxVolume(options.volume), soundId);
	howl.rate(normalizeSfxRate(options.rate), soundId);
	if (options.tag) {
		const tag = options.tag;
		taggedSounds.set(tag, { token, howl, id: soundId });
		const clear = () => {
			if (taggedSounds.get(tag)?.token === token) taggedSounds.delete(tag);
		};
		howl.once('end', clear, soundId);
		howl.once('stop', clear, soundId);
	}
	return soundId;
}

/**
 * The 18 ms RSVP tick remains procedural for precise 1,500 WPM timing, but it
 * now uses the context that Howler has already unlocked and owns.
 */
export function playReaderTick() {
	if (
		!audioState.enabled ||
		!audioState.started ||
		!ensureInitialized() ||
		!Howler.usingWebAudio ||
		!Howler.ctx ||
		!Howler.masterGain
	)
		return;
	const ctx = Howler.ctx;
	if (ctx.state !== 'running') return;
	const now = ctx.currentTime;
	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	oscillator.type = 'sine';
	oscillator.frequency.value = 880;
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.036, now + 0.002);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
	oscillator.connect(gain);
	gain.connect(Howler.masterGain);
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
	if (active) {
		if (!active.howl.playing(active.id)) canceledSoundIds.add(active.id);
		active.howl.stop(active.id);
	}
}

export function suspendAudio() {
	if (!initialized) return;
	if (Howler.usingWebAudio && Howler.ctx) {
		if (Howler.ctx.state === 'running') void Howler.ctx.suspend();
		return;
	}
	if (activeMusic?.howl.playing(activeMusic.id)) {
		activeMusic.howl.pause(activeMusic.id);
		htmlMusicPaused = true;
	}
	for (const [tag, active] of taggedSounds) {
		if (!active.howl.playing(active.id)) continue;
		active.howl.pause(active.id);
		htmlTagsPaused.add(tag);
	}
}

export function resumeAudio() {
	if (!audioState.enabled || !audioState.started || !ensureInitialized()) return;
	Howler.mute(false);
	if (Howler.usingWebAudio && Howler.ctx) {
		if (Howler.ctx.state === 'running') {
			if (!activeMusic && completedMusicTrack !== desiredMusicTrack)
				void switchMusic(desiredMusicTrack, false);
			return;
		}
		void Howler.ctx
			.resume()
			.then(() => {
				if (!activeMusic && completedMusicTrack !== desiredMusicTrack)
					void switchMusic(desiredMusicTrack, false);
			})
			.catch((error) => warn('Audio resume failed', error));
		return;
	}
	if (htmlMusicPaused && activeMusic) activeMusic.howl.play(activeMusic.id);
	htmlMusicPaused = false;
	for (const tag of htmlTagsPaused) {
		const active = taggedSounds.get(tag);
		if (active) active.howl.play(active.id);
	}
	htmlTagsPaused.clear();
	if (!activeMusic && completedMusicTrack !== desiredMusicTrack)
		void switchMusic(desiredMusicTrack, false);
}
