const MUSIC = {
	default: {
		path: '/audio/music/puzzle-chamber-loop.mp3',
		volume: 1.12,
		loop: true,
		rateSensitive: true
	},
	asteroid: {
		path: '/audio/music/asteroid-countdown.mp3',
		volume: 1.28,
		loop: false,
		rateSensitive: false
	},
	report: {
		path: '/audio/music/final-report-loop.mp3',
		volume: 0.768,
		loop: true,
		rateSensitive: false
	}
};

/** @type {Record<string, { path: string, volume: number }>} */
const SFX = {
	// Gains are source-normalization trims, not relative percentages. The
	// generated files vary by more than 40 dB, so quiet recordings legitimately
	// need values above 1; their measured peaks leave ample headroom after boost.
	'ui-tap': { path: '/audio/sfx/ui-tap.mp3', volume: 0.3 },
	'ui-toggle': { path: '/audio/sfx/ui-toggle.mp3', volume: 0.47 },
	'ui-confirm': { path: '/audio/sfx/ui-confirm.mp3', volume: 3.4 },
	'slider-detent': { path: '/audio/sfx/slider-detent.mp3', volume: 0.49 },
	'drag-pickup': { path: '/audio/sfx/drag-pickup.mp3', volume: 0.52 },
	'drop-valid': { path: '/audio/sfx/drop-valid.mp3', volume: 0.75 },
	'drop-invalid': { path: '/audio/sfx/drop-invalid.mp3', volume: 0.78 },
	'page-turn': { path: '/audio/sfx/page-turn.mp3', volume: 2.5 },
	'chat-send': { path: '/audio/sfx/chat-send.mp3', volume: 7 },
	'illusion-reveal': { path: '/audio/sfx/illusion-reveal.mp3', volume: 1.12 },
	'balance-settle': { path: '/audio/sfx/balance-settle.mp3', volume: 0.88 },
	'elevator-button': { path: '/audio/sfx/elevator-button.mp3', volume: 0.84 },
	'elevator-approach': { path: '/audio/sfx/elevator-approach.mp3', volume: 0.651 },
	'elevator-open': { path: '/audio/sfx/elevator-open.mp3', volume: 0.133 },
	'elevator-shut': { path: '/audio/sfx/elevator-shut.mp3', volume: 0.385 },
	'asteroid-warning': { path: '/audio/sfx/asteroid-warning.mp3', volume: 0.27 },
	'asteroid-approach': { path: '/audio/sfx/asteroid-approach.mp3', volume: 0.44 },
	'asteroid-impact': { path: '/audio/sfx/asteroid-impact.mp3', volume: 0.71 },
	'result-reveal': { path: '/audio/sfx/result-reveal.mp3', volume: 1.9 }
};

const STORAGE_KEY = 'personality-quiz-sound';
const CORE = ['ui-tap', 'ui-toggle', 'ui-confirm', 'slider-detent', 'drag-pickup', 'drop-valid'];

export const audioState = $state({
	enabled: true,
	started: false,
	ready: false,
	rate: 1,
	/** The source that is audibly running; empty while loading/switching. */
	musicTrack: ''
});

/** @type {AudioContext | null} */
let context = null;
/** @type {GainNode | null} */
let masterGain = null;
/** @type {GainNode | null} */
let musicGain = null;
/** @type {GainNode | null} */
let sfxGain = null;
/** @type {BiquadFilterNode | null} */
let musicHighpass = null;
/** @type {BiquadFilterNode | null} */
let musicLowpass = null;
/** @type {DynamicsCompressorNode | null} */
let musicLimiter = null;
/** @type {AudioBufferSourceNode | null} */
let musicSource = null;
/** @type {keyof typeof MUSIC} */
let musicTrack = 'default';
let musicSwitchToken = 0;
const buffers = new Map();
const pending = new Map();
const duckRequests = new Map();
const taggedSounds = new Map();
let hydrated = false;

function ensureContext() {
	if (context || typeof window === 'undefined') return context;
	const Context = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
	if (!Context) return null;
	context = new Context();
	masterGain = context.createGain();
	musicGain = context.createGain();
	sfxGain = context.createGain();
	musicHighpass = context.createBiquadFilter();
	musicLowpass = context.createBiquadFilter();
	musicLimiter = context.createDynamicsCompressor();
	musicHighpass.type = 'highpass';
	musicLowpass.type = 'lowpass';
	musicHighpass.frequency.value = 20;
	musicLowpass.frequency.value = 20000;
	musicLimiter.threshold.value = -3;
	musicLimiter.knee.value = 1;
	musicLimiter.ratio.value = 20;
	musicLimiter.attack.value = 0.003;
	musicLimiter.release.value = 0.12;
	musicGain.gain.value = MUSIC[musicTrack].volume;
	sfxGain.gain.value = 1;
	masterGain.gain.value = audioState.enabled ? 1 : 0;
	musicHighpass.connect(musicLowpass);
	musicLowpass.connect(musicGain);
	musicGain.connect(musicLimiter);
	musicLimiter.connect(masterGain);
	sfxGain.connect(masterGain);
	masterGain.connect(context.destination);
	return context;
}

/** @param {string} id */
async function loadBuffer(id) {
	if (buffers.has(id)) return buffers.get(id);
	if (pending.has(id)) return pending.get(id);
	const ctx = ensureContext();
	if (!ctx) return null;
	const musicId = id.startsWith('music:') ? id.slice(6) : null;
	const asset = musicId ? MUSIC[musicId] : SFX[id];
	if (!asset) return null;
	const promise = fetch(asset.path)
		.then((response) => {
			if (!response.ok) throw new Error(`Audio load failed: ${asset.path}`);
			return response.arrayBuffer();
		})
		.then((data) => ctx.decodeAudioData(data))
		.then((buffer) => {
			buffers.set(id, buffer);
			pending.delete(id);
			return buffer;
		})
		.catch((error) => {
			pending.delete(id);
			if (import.meta.env.DEV) console.warn(error);
			return null;
		});
	pending.set(id, promise);
	return promise;
}

function effectiveDuck() {
	return Math.min(1, ...duckRequests.values());
}

function updateMusicGain() {
	if (!context || !musicGain) return;
	const track = MUSIC[musicTrack];
	const rateTrim =
		track.rateSensitive && audioState.rate >= 4
			? 0.72
			: track.rateSensitive && audioState.rate < 0.5
				? 1.5
				: 1;
	musicGain.gain.setTargetAtTime(
		track.volume * effectiveDuck() * rateTrim,
		context.currentTime,
		0.12
	);
}

function startMusicSource() {
	if (!context || !musicHighpass || musicSource || !audioState.enabled) return;
	const sourceTrack = musicTrack;
	const track = MUSIC[sourceTrack];
	const buffer = buffers.get(`music:${sourceTrack}`);
	if (!buffer) return;
	const source = context.createBufferSource();
	source.buffer = buffer;
	source.loop = track.loop;
	source.playbackRate.value = track.rateSensitive ? audioState.rate : 1;
	source.connect(musicHighpass);
	source.start();
	musicSource = source;
	audioState.musicTrack = sourceTrack;
	source.onended = () => {
		if (musicSource === source) musicSource = null;
		if (audioState.musicTrack === sourceTrack) audioState.musicTrack = '';
		source.disconnect();
	};
	updateMusicGain();
	audioState.ready = true;
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
	if (!ctx) return;
	if (masterGain) masterGain.gain.setTargetAtTime(1, ctx.currentTime, 0.04);
	const requestedTrack = musicTrack;
	// Music startup must not wait for unrelated effects. In particular, a slow
	// SFX request used to leave the score queued until a later click resumed the
	// context again, making the click look like the thing that started music.
	void Promise.all([ctx.resume(), loadBuffer(`music:${requestedTrack}`)])
		.then(([, buffer]) => {
			if (!audioState.enabled || !buffer || musicTrack !== requestedTrack) return;
			startMusicSource();
		})
		.catch((error) => {
			if (import.meta.env.DEV) console.warn(error);
		});

	// Core controls are useful early, but their network/decode work is entirely
	// independent from the soundtrack's critical startup path.
	for (const id of CORE) void loadBuffer(id);
	const preload = () => {
		for (const id of Object.keys(SFX)) void loadBuffer(id);
		for (const id of Object.keys(MUSIC)) void loadBuffer(`music:${id}`);
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(preload);
	else setTimeout(preload, 500);
}

/** @param {boolean} enabled */
export function setAudioEnabled(enabled) {
	audioState.enabled = enabled;
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
	if (enabled && audioState.started) {
		startAudio();
	} else if (context && masterGain) {
		masterGain.gain.setTargetAtTime(0, context.currentTime, 0.025);
	}
}

/** @param {number} rate */
export function setMusicRate(rate) {
	const next = rate < 0.5 ? 1 / 3 : rate >= 4 ? 5 : 1;
	audioState.rate = next;
	if (!context) return;
	if (musicSource && MUSIC[musicTrack].rateSensitive)
		musicSource.playbackRate.setTargetAtTime(next, context.currentTime, 0.2);
	if (musicHighpass)
		musicHighpass.frequency.setTargetAtTime(next === 1 / 3 && MUSIC[musicTrack].rateSensitive ? 34 : 20, context.currentTime, 0.2);
	if (musicLowpass) musicLowpass.frequency.setTargetAtTime(next === 5 ? 7600 : 20000, context.currentTime, 0.2);
	updateMusicGain();
}

/**
 * Crossfade to one of the purpose-built music cues. The requested track is
 * remembered even before the first user gesture, so debug deep links still
 * start the correct score when audio unlocks.
 * @param {keyof typeof MUSIC} id
 * @param {{ restart?: boolean }} [options]
 */
export async function setMusicTrack(id, { restart = false } = {}) {
	if (!MUSIC[id]) return;
	const alreadyPlaying = musicTrack === id && musicSource;
	if (alreadyPlaying && !restart) return;
	musicTrack = id;
	const token = ++musicSwitchToken;
	const buffer = await loadBuffer(`music:${id}`);
	if (token !== musicSwitchToken || !buffer || !audioState.enabled || !audioState.started) return;
	const ctx = ensureContext();
	if (!ctx || !musicGain) return;

	const previous = musicSource;
	musicSource = null;
	audioState.musicTrack = '';
	musicGain.gain.cancelScheduledValues(ctx.currentTime);
	musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.045);
	setTimeout(() => {
		if (token !== musicSwitchToken) return;
		if (previous) {
			try {
				previous.stop();
			} catch {
				// It may have reached the end during the crossfade.
			}
		}
		startMusicSource();
	}, 140);
}

/** @param {string} key @param {number} amount */
export function duckMusic(key, amount) {
	duckRequests.set(key, Math.max(0, Math.min(1, amount)));
	updateMusicGain();
}

/** @param {string} key */
export function clearMusicDuck(key) {
	duckRequests.delete(key);
	updateMusicGain();
}

/**
 * @param {keyof typeof SFX} id
 * @param {{ volume?: number, rate?: number, tag?: string }} [options]
 */
export async function playSfx(id, options = {}) {
	if (!audioState.enabled || !audioState.started) return null;
	const ctx = ensureContext();
	if (!ctx || !sfxGain) return null;
	void ctx.resume();
	const token = {};
	if (options.tag) {
		stopSfx(options.tag);
		taggedSounds.set(options.tag, { token, source: null });
	}
	const buffer = await loadBuffer(id);
	if (!buffer || !audioState.enabled) return null;
	if (options.tag && taggedSounds.get(options.tag)?.token !== token) return null;
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	source.buffer = buffer;
	source.playbackRate.value = options.rate ?? 1;
	gain.gain.value = (SFX[id]?.volume ?? 0.3) * (options.volume ?? 1);
	source.connect(gain);
	gain.connect(sfxGain);
	if (options.tag) taggedSounds.set(options.tag, { token, source });
	source.onended = () => {
		if (options.tag && taggedSounds.get(options.tag)?.source === source) taggedSounds.delete(options.tag);
		source.disconnect();
		gain.disconnect();
	};
	source.start();
	return source;
}

/**
 * A deliberately tiny procedural "dit" for the RSVP reader. At 1,500 WPM a
 * file-backed effect would spend much of its 40 ms beat decoding or overlapping
 * its own tail, so this is scheduled directly on the shared Web Audio clock.
 * It still passes through the SFX and master gains, and therefore respects the
 * quiz-wide sound preference.
 */
export function playReaderTick() {
	if (!audioState.enabled || !audioState.started) return;
	const ctx = ensureContext();
	if (!ctx || !sfxGain) return;
	void ctx.resume();

	const now = ctx.currentTime;
	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	oscillator.type = 'sine';
	oscillator.frequency.value = 880;
	// An 18 ms dot: audible as a soft timing cue, with enough silence left
	// before the next 40 ms word beat to keep it from becoming a solid tone.
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.036, now + 0.002);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
	oscillator.connect(gain);
	gain.connect(sfxGain);
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
	if (!active?.source) return;
	try {
		active.source.stop();
	} catch {
		// Already ended.
	}
}

export function suspendAudio() {
	if (context?.state === 'running') void context.suspend();
}

export function resumeAudio() {
	if (audioState.enabled && audioState.started && context?.state === 'suspended') void context.resume();
}
