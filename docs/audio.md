# Quiz audio

The quiz uses one intent-driven Web Audio engine for music, sound effects and
the procedural fast-reader tick. Howler and `HTMLAudioElement` are deliberately
not used: the authored patience modes require exact one-third and five-times
playback, and using two playback systems makes interruption recovery capable of
creating duplicate music.

## Runtime contract

`src/lib/audio/audio.svelte.js` is the Svelte-facing facade. Its coordinator
records the complete desired music intent synchronously before it performs any
asynchronous resume, fetch or decode work. Each intent gets a monotonically
increasing revision; work from an older revision may fill a cache but may never
start a source or change public state.

The supported facade is:

```js
audio.activateFromGesture();
audio.recoverFromGesture();
audio.setEnabled(enabled);
audio.prepareMusic(track);

audio.music.play(track, { cueKey, rate, startOffset, restart, transition });
audio.music.stop({ transition });
audio.music.setRate(rate, { rampMs });
audio.music.duck(owner, gain); // returns an idempotent release function
audio.music.setEq(gainsDb, { rampMs }); // six bands, dB, in MUSIC_EQ_BANDS order

audio.sfx.play(id, { volume, rate, tag, maxLatencyMs });
audio.sfx.stop(tag);
audio.sfx.createScope(name);
audio.suspend();
audio.resume();
audio.dispose();
```

`music.play()` starts or switches music. Repeating the same cue key is
idempotent; a new cue key (or `restart: true`) starts a new instance. The
returned request resolves `whenStarted` with `playing`, `silent`,
`superseded`, or `failed`, so a timed scene can wait for its own cue instead of
inferring readiness from a global track name.

Public status is one of `idle`, `locked`, `loading`, `playing`, `silent`,
`interrupted`, `recoverable`, or `error`. `requestedTrack` describes intent;
`activeTrack` describes the source the transport actually owns. The UI must
never call a source "ready" merely because `start()` was requested.

### One-voice invariant

There may be zero or one audible music source in a document. Switching uses an
exclusive 140 ms handoff:

1. Fetch and decode the replacement.
2. Fade the current source to zero, stop it, and disconnect it.
3. Start and fade in the replacement.

There is no crossfade. Live sources, fade timers and natural-end callbacks are
owned and cleaned up by the transport; asynchronous coordinator work is
revision-checked before it may change playback. Fetches and decodes are
cache-owned, so obsolete work may still populate a reusable cache but may never
start a stale source. Explicit silence is its own intent, not a side effect of
marking an old track complete. A failed replacement stops music that no longer
belongs to the scene, keeps the quiz usable, and changes the sound control to a
visible **Retry sound** action.

Music rate modes are `slow` (1/3), `normal` (1), and `fast` (5). Only the
default score is rate-sensitive. Changes use a one-second exponential ramp
with an exact endpoint; an in-progress ramp is held at its instantaneous value
before a reversal so fast-to-normal and slow-to-normal cannot jump or retain
stale automation.

## Authored cue sheet

| Quiz state | Music intent | Other audio |
| --- | --- | --- |
| Intro | Explicit silence; no context yet | Begin activates audio and plays `ui-confirm` |
| Ordinary questions and interludes | Default loop at the current patience rate | UI and question cues |
| Elevator | Default loop ducked to 22% | Scoped approach, button and door-result cues |
| Asteroid | Finite asteroid cue at 1x | Warnings, approach and impact |
| Final “Take a breath” interlude | Explicit music silence | Page turn and Continue confirmation remain |
| Result | Report loop at 1x | Result reveal |
| Take it again | New-run default cue at 1x | Confirmation |

Global music policy belongs to the quiz orchestrator. Question and result
components do not choose global tracks. Scene components may own scoped sound
effects and duck leases; destroying a scope cancels both pending and active
cues. Custom button cues suppress the generic tap unless layering is explicitly
part of the cue sheet. The elevator button plus door result and result reveal
plus report music are intentional layers.

The elevator and asteroid use pausable scene time. Hiding the page, locking the
device, or receiving an audio interruption pauses the decision clock and audio
together. The asteroid's finite score is aligned to every authored deadline:
the 5, 10 and 20-second variants enter at the matching point in the score, the
30-second variant begins at zero, and the 30-minute variant is intentionally
silent until its final 30 seconds. A late sound enable joins the same aligned
timeline. A naturally ended finite cue is not restarted by visibility recovery.

## Platform lifecycle and recovery

The engine feature-detects `navigator.audioSession`, requests the `playback`
category, and then creates/resumes its sole `AudioContext` from Begin, sound
enable, restore, or another trusted gesture. It observes context state,
Audio Session state, visibility, `pagehide`, and `pageshow`, including Safari's
`interrupted` state.

Normal foreground recovery first resumes the existing context and briefly
checks that its audio clock is genuinely advancing, rather than trusting a
nominal `running` state. If that fails, the sound control becomes **Restore
sound**. That user action stops and disconnects the old graph, initiates its
close, and creates/resumes one replacement before the trusted gesture expires;
the current cue is then reconciled on that graph. The engine never starts a
hidden HTML-media fallback, because JavaScript cannot prove whether a nominally
running path is physically audible and a speculative fallback could produce
the exact duplicate playback this system forbids.

Muted sources keep their scene time so unmuting stays synchronized. A cue that
was never started because sound was disabled may join a finite scene at its
elapsed offset. Fetch, resume, suspend, close and decode operations are bounded,
so a Safari platform promise cannot leave a scene in `loading` forever.
Interruption and stalled-clock failures offer **Restore sound**; asset, decode,
start and transport failures offer **Retry sound**. Their detailed categories
remain available in development traces.

## Assets and memory

The default and asteroid music files were generated with ElevenLabs on 2026-07-18.
The report music is the supplied Victorian Victory credits track:

- `puzzle-chamber-loop.mp3`: 90-second looping default score, rate-sensitive.
- `asteroid-countdown.mp3`: 30-second finite countdown with a quiet final tail.
- `victorian-victory.mp3`: two-minute report score, copied from the root-level
  `Victorian_Victory_Credits_2026-07-21T000411.mp3` source file.

The default file is mastered for gain `0.667` at normal speed, `1` slow and
`0.48` fast. Asteroid and report play at gain `1`; scene ducks are applied on
top. Music goes through a six-band equalizer and then a limiter before the
master bus, while SFX connect to a separate bus:

```
musicVoice → musicBus → eq[0..5] → limiter → masterGain → destination
sfxVoice   → sfxBus   ─────────────────────↗
```

## Equalizer

The equalizer question hands its answer to `audio.music.setEq()`, and the music
adopts it for the rest of the session. Bands are declared once in
`MUSIC_EQ_BANDS` (`web-audio-transport.js`) and the question renders its faders
from that list, so a fader is always wired to the filter beside it. Shelves on
the endpoints, peaks between; ±12 dB, clamped.

Four properties this relies on:

- **Bus-level, not per-voice.** The filters live on the music bus, so the
  setting outlives every track change with no re-application logic in the intent
  machine. It colours the asteroid countdown and the final report too.
- **Music only.** SFX join downstream of both the EQ and the limiter. The
  answer shapes the score, never the taker's own button clicks.
- **Applied raw, by design.** No makeup gain and no partial blend: a maxed curve
  is meant to sound maxed. The limiter downstream is what keeps that from
  becoming an actual clipping blast, which is why the EQ must stay ahead of it.
- **Survives everything.** Gains are held on the transport instance, not in the
  graph, so `_ensureContext` seeds new filters from them after a recovery
  rebuild — and an answer given before the first gesture lands when audio
  unlocks. A context that cannot make biquads routes music straight to the
  limiter and simply loses the colouring.

Like ducking, this bypasses the coordinator entirely: it changes how the music
sounds, never what is playing, so it has no business in intent revisions.

When sound is enabled on the intro, the app may prefetch compressed bytes for
the default score and core UI cues without creating an audio context. After
activation it prefetches remaining compressed assets. Only current/upcoming
music is decoded; obsolete music buffers are evicted rather than retaining all
three decoded tracks on memory-constrained iPhones. Short SFX are cached, UI
cues that miss their latency window are dropped rather than played late, and
high-frequency effects have explicit voice caps.

## Verification

The automated coordinator suite covers hanging obsolete loads, immediate stop,
rapid A→B→A intent changes, same-cue idempotence, rate-only updates,
mute/unmute without a restart, exclusive handoff, stale scoped handles, finite
natural end, pending-request recovery, transport failures and an out-of-order
suspend/resume race. Transport and mix tests cover the one-live-source
invariant, finite offsets, stale `onended` callbacks, scoped/tagged SFX,
AudioSession state handling, bounded resume/decode, advancing-clock detection,
recovery preloading, graph-construction rollback, rate-ramp preservation and
deterministic disposal. A separate scene-timing test covers every asteroid
deadline and late-start offset.

Playwright smoke tests run in desktop Chromium, Firefox and WebKit plus emulated
Android Chrome and Mobile Safari viewports. They verify that every registered
asset is served, Begin reaches an active default source, mute/unmute does not
start another source, a same-document report switch and stop settle correctly,
the asteroid reaches an active source, final-breath silence is explicit, and
Restore creates one replacement context and returns to active playback. Browser
emulation cannot prove that a physical device speaker
produced sound, so a release still needs an audible pass on physical iPhone and
iPad hardware spanning the newest and oldest supported iOS/iPadOS versions:

- Silent switch on and off; sound initially on and initially off.
- Begin, mute/unmute, and the visible restore action.
- Fast, slow, escape-hatch and return-to-normal transitions.
- Elevator duck/cue cleanup and backgrounding during its deadline.
- Asteroid start, warnings, impact, late sound enable, and final silence.
- Result music and Take it again.
- Tab/app background and foreground, screen lock/unlock, and an interruption
  such as Siri or an incoming call.

The supported matrix is current Chrome, Edge, Firefox, Safari and Android
Chrome plus the current and previous two major iOS/iPadOS Safari releases. The
guarantee is per document; separate quiz tabs remain independent.
