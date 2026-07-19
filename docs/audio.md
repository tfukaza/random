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

The default quiz music follows the patience answer: impatient plays at 5× and patient
plays at one-third speed. The patient-mode mix is raised to 150% of the normal music
level to compensate for the slower track's reduced audibility. Scene-specific tracks
always play at their authored rate. All three music tracks use an 8× base-level boost
over their initial mix, and the report theme receives a further 20% lift. A music-only
-3 dB safety limiter catches peaks from the combined gain and patient-mode compensation;
none of these changes affect sound-effect gain.

## Sound effects

The files in `static/audio/sfx/` were generated with ElevenLabs Sound Effects as 44.1 kHz,
128 kbps MP3s. Prompts requested dry, restrained, voiceless sounds in a paper, wood,
celesta, and chamber-game palette.

- Core UI: tap, toggle, confirmation, slider detent, drag pickup, valid/invalid drop.
- Transitions: page turn and result reveal.
- Scenes: chat send, illusion reveal, balance scale, elevator button/approach/open/shut,
  and asteroid warning/approach/impact.

Runtime mix levels and file mappings live in `src/lib/audio/audio.svelte.js`.
The source files were measured in 10 ms PCM windows and given per-file normalization trims.
Routine UI sounds land near a common active level; long ambience is slightly lower, while
the asteroid warning and impact retain intentional dramatic headroom. Some trims exceed 1
because the original recording is exceptionally quiet, not because the output is above unity.

The fast RSVP reader uses a procedural 18 ms sine-wave "dit" per displayed word. It is
generated on the shared Web Audio clock instead of loaded from a file so it remains tightly
synchronized at 1,500 WPM and does not overlap its own tail. Its 0.036 peak gain keeps it
audible over the deliberately accelerated background score.
