# Quiz audio

Generated with ElevenLabs on 2026-07-18 for this project.

## Music

- `static/audio/music/puzzle-chamber-loop.mp3`
- ElevenLabs Music v2, seed `471105`, 90 seconds, stereo 48 kHz MP3.
- Direction: an original seamless chamber-puzzle loop at 92 BPM with pizzicato strings,
  celesta, clarinet, bassoon, restrained clockwork percussion, paper and wood textures,
  no vocals, no climax, and no conclusive ending.
- `static/audio/music/asteroid-countdown.mp3`
- ElevenLabs Music v2, seed `5047`, 30 seconds, 192 kbps MP3. Its chamber suspense
  arc is timed to Q50's countdown and withdraws into near-silence for the final three
  seconds so the separately mixed explosion owns the impact.
- `static/audio/music/final-report-loop.mp3`
- ElevenLabs Music v2, seed `12854`, 45 seconds, 192 kbps MP3. A warm, quiet,
  loopable chamber-certificate theme used only for the final report.

The music files were remastered once after generation so Howler never needs a runtime
volume above `1`. The default loop has its maximum patient-mode gain (`1.12 × 1.5`)
and -3 dB safety ceiling baked in; Howler plays that file at `0.667` normally, `1.0`
at one-third speed, and `0.48` at 5× speed. The asteroid and report tracks have their
previous `1.28` and `0.768` gains baked in and always play at their authored rate.
Changes between patience playback rates use a one-second exponential pitch glide, matching
the record-like wind-down of the original Web Audio implementation instead of stepping
instantly between rates.

## Sound effects

The files in `static/audio/sfx/` were generated with ElevenLabs Sound Effects as 44.1 kHz,
128 kbps MP3s. Prompts requested dry, restrained, voiceless sounds in a paper, wood,
celesta, and chamber-game palette.

- Core UI: tap, toggle, confirmation, slider detent, drag pickup, valid/invalid drop.
- Transitions: page turn and result reveal.
- Scenes: chat send, illusion reveal, balance scale, elevator button/approach/open/shut,
  and asteroid warning/approach/impact.

The source files were measured in 10 ms PCM windows and their former runtime trims were
baked into the MP3s: UI tap `0.3`, toggle `0.47`, confirm `3.4`, slider `0.49`, pickup
`0.52`, valid/invalid drop `0.75`/`0.78`, page turn `2.5`, chat send `7`, illusion
`1.12`, balance `0.88`, elevator button/approach/open/shut `0.84`/`0.651`/`0.133`/
`0.385`, asteroid warning/approach/impact `0.81`/`0.44`/`0.71`, and result reveal
`1.9`. The warning's baked `0.81` includes its authored 3× final-countdown emphasis.
Per-play runtime volume is now only an attenuation in Howler's `0–1` range.

The fast RSVP reader uses a procedural 18 ms sine-wave "dit" per displayed word. It is
generated on Howler's unlocked Web Audio clock instead of loaded from a file so it remains
tightly synchronized at 1,500 WPM and does not overlap its own tail. Its 0.036 peak gain
keeps it audible over the deliberately accelerated background score.

Runtime playback uses Howler.js 2.2.4. Howler owns mobile audio unlocking, Web Audio/HTML5
fallback, decoded-buffer caching, sound pools, and automatic context suspension. The quiz
still begins playback from the explicit Begin gesture required by browser autoplay policy;
later pointer or keyboard gestures resume an audio context interrupted by iOS.
