# Design: the anti–personality-quiz

*What this game is, why every question looks the way it does, and where new
questions should aim. Read this before adding a question; read `lore.md` for
arc/reprise/state conventions.*

## Premise

This quiz is an **antithesis of personality quizzes** — a parody of a genre
whose science has always been somewhere between thin and fictional. It looks
like the most serious personality assessment ever administered: engraved
stationery, formal serif type, a wax-sealed certificate of a results page. It
behaves like the genre's id: absurd scenarios, invasive instruments, moral
questions no BuzzFeed quiz would touch, and a scoring system exactly as
rigorous as the ones it parodies (that is: not).

**The quiz never winks.** That is the load-bearing tone rule. No emoji, no
"lol", no acknowledging a joke was made. Absurdity is delivered on letterhead.
A reveal animation presents *evidence*, not a punchline. If a question knows
it's funny, it stops being funny.

**The title** is *The Standardized Evaluation of Emotional Disposition* —
built exactly like a real instrument's name (MMPI, LOT-R, PAI: imposing
adjective + Evaluation + of X), because no genuine instrument is named as a
question. Its initials spell **SEED**, which is the botanical punchline of the
whole quiz surfacing in the letterhead: the result declares you one of 128
plants, binomial and all. **The site never prints the acronym anywhere** — not
the tab title, not the seal, not the share text. Per the never-winks rule, the
taker assembles it themselves, or doesn't. Do not "helpfully" abbreviate it in
any future copy.

## The six pillars

Every question should serve at least one. Canonical built examples cited.

### P1 — Absurd questions, asked straight

Scenarios no sane instrument would pose, phrased with the gravity of a census
form. The absurdity is in the premise, never in the delivery.

Built: Q36 (would you buy this $4,800 lantern — name and price only), Q9 (one
meal a year), the chapter-4 security-question run (favourite food → childhood
street → mother's maiden name, asked in the same voice as everything else).

### P2 — The quiz validates you

Personality quizzes take your self-report at face value. This one **tests
it**. Claims made in one question become claims examined by a later one — the
quiz is running its own replication study on you, and it is not impressed.

Built: patience-claim → PatienceLens (you *said* you were patient; every
following question in the chapter is now delivered at the speed you claimed to
want, and the finale hands you a five-second or thirty-minute countdown to
match), memory-claim → recall-trap (claim a good memory in chapter 3 and, a
chapter later, you are asked for that question's *exact wording* against four
near-misses — but only if you claimed it in the strongest terms), honesty-claim
→ found-wallet, detail-claim → the two illusions.

**pack-box tests attention rather than a claim.** The sixteen belongings total
49 blocks; the box holds 48, and says so. Every item prints its block count
beside its name, so the arithmetic proving the box cannot take everything is on
screen from the first second — stated plainly, never pointed at, per P6. The
question is not "can you pack it" but "how long do you spend on something that
cannot be done". Spending **more than 32 pick-ups and more than a minute** costs
detail-orientation (`scope +3`, since scope runs negative = detail-oriented).
Both conditions are required: a fast flurry is someone playing, and a long sit
with few moves is someone thinking, and neither is the failure being measured.

Crucially, a *perfect* 48/48 fill is still reachable — but only by leaving a
one-cell item behind (the mug or the papers; both such subsets tile, verified
exhaustively). That is the observant taker's reward, and it is why the
impossibility is of *bringing everything* rather than of filling the box. A
puzzle where perfect play is also unreachable would just be spiteful.

**memory-claim → recall-trap → the scene pair** is the longest chain in the
quiz, and worth reading as one instrument. `memory-claim` plants a boast.
`recall-trap` collects it: claim a good memory *in the strongest terms* and you
are asked for that question's exact wording; claim it more softly, or not at
all, and you are asked, sincerely, which single kind of memory you trust most —
episodic, semantic, working, prospective, spatial. That answer is a **branch
key**. A chapter later, `scene-watch` openly says *"watch this scene and let it
soak in"* (an IQ-test pretense, no longer disguised) and shows an animated
street corner for a fixed window, with a Continue gate that only opens once the
window has run. `scene-recall` then tests *precisely the faculty you named*:

- **spatial** → *"which of these stood out to you?"* over positions phrased
  relative to landmarks ("the thing above the bicycle"). Some point at real
  occupants, some at empty cells — picking a phantom is recalling something that
  was never there.
- **working** → *"which object showed your favourite number, 1–10?"* Real picks
  are the props that bore a digit (door 4, crate 6, stop 9); the traps carried
  only letters (the sign, the chalkboard).
- **episodic** → reorder the four timed events (presented scrambled).
- **semantic** → the shop sign, against one-word-apart near-misses.

- **prospective** → the scene's chalkboard planted "remember the colour of the
  door", and this collects it, against colour decoys.

These are all **phantom-trap choices**, the same shape as recall-trap's
phrasings: each wrong option is a plausible confabulation, not a throwaway. The
strong-claim path, which never named a type, gets the gauntlet its boast earned:
**recreate the scene** — the fifteen components in a tray, a blank grid, put them
back.

Nobody chose the faculty to be examined on; they chose the one they were proud
of, and the quiz took them at their word.

**Difficulty is a second, orthogonal vector.** `easy-or-hard` (the "easy life vs
hard life" slider, answered ~9 questions earlier) sets the *tier*, independent of
faculty: **1–2 (easy life) → the easy variant · 3–6 → the normal phantom-trap
version · 7 (hard life) → recreate the whole scene.** A strong `memory-claim`
also routes to recreate; recall-trap's new *"I'm bad at all of them"* answer
(`recall.type = 'none'`) routes to the easy tier. Faculty picks *which* probe,
difficulty picks *how hard* — `probeFor(type, claimedStrongly, difficulty)` in
`sceneModel.js`.

Crucially, **easy does not switch off the memory test** — it keeps the phantom
traps and still scores on correctness, it only lowers the phrasing's load.
Spatial drops relational computation for plain object names (phantoms are objects
that weren't there — a fire hydrant); working asks for the bare digit (phantoms
are numbers never shown); semantic swaps near-misses for obviously-wrong names;
episodic asks only what came first. Admitting you are bad at memory earns an
easier test, not a harder one — a small mercy, in a quiz that offers few.

Correctness is **derived** in `sceneModel.js` from the same grid the scene is
drawn on — the relations, the numbered props, the recreate answer key are all
read from the layout that draws the art, so the picture and the grading cannot
drift. That is the one bug class no amount of playtesting would show, so it is
covered by unit tests instead — including the full difficulty×faculty routing
table.

**Only endpoints arm a consequence.** A 2 or a 6 on a 1–7 slider is a
preference; a 1 or a 7 is a claim, and the quiz only ever bills people for
claims they failed to keep. Widening this puts the punishment in front of people
who never asserted anything. *(Under review — the author is considering whether
refusing to commit, i.e. never answering 1 or 7, should itself cost something.
That would invert this rule. Not yet decided; see the plan file's "Noted for
later".)*

**The scene pair is exempt from PatienceLens fast mode.** A patience claim of 1
speed-reads prose at 1,500 wpm for the rest of the quiz; a memory test
delivered that way is unfair in a way no other question is. The scene sits
outside the patience band by placement, but fast mode is not band-bounded, so
`scene-watch`/`scene-recall` must not be sped past readability. The slow path is
fine — it is CSS, so the watch window and the events stretch together and stay
in step. *(Placement keeps them clear of the ×0.05 band; the fast-mode carve-out
is the open edge, flagged here so it is not forgotten.)*

**How PatienceLens scales time** (`src/lib/PatienceLens.svelte`). Shared
controls publish authored text and choice labels in their rendered markup, so
the impatient path can read arbitrary questions without replacing their real
controls. The patient path works on the *animations*. Every
pre-answer animation in this app is CSS, so `host.getAnimations({subtree:
true})` returns all of them (transitions included) and setting each one's
`playbackRate` scales its whole timing, delays and staggers alike. Claim 7
and the chapter runs at **×0.05 — about 20 seconds for a question that normally
arrives in ~1.25s** — with pointer events off until it finishes, because
elements fading in from `opacity: 0` are otherwise invisible but clickable.
Claim 1 speed-reads all authored prose and choices at 1,500 wpm, keeps visual
cues and controls visible, replaces option labels with the corresponding reader
numbers, and unlocks interaction only when the reader ends. That mode runs to
the END OF THE QUIZ and no further — the report is exempt and always reads at
normal speed (`fastPersistent` in `+page.svelte` is scoped to the quiz phase,
and the Result renders with no lens at all). Interludes always render normally
as breathing room; the escape hatch is offered only in the original patience
chapter. The № marker lives *inside* the lens in
`+page.svelte` precisely so it is governed too.

Three things to preserve if you touch it: grip the animations **on mount, not
on `animationstart`** (a CSS animation is returned during its delay phase, so
catching it at mount scales the delay; `animationstart` fires after the delay
has already run at full speed); exclude infinite animations from the
arrival check or a looping decoration will hold the question forever; and fail
open when `getAnimations` is missing, or the taker is stranded on a question
they can never answer.

JS-driven timing (`tweened`, `setTimeout`) is deliberately **not** scaled. In
this chapter every such timer fires only after an answer is given, and once you
have answered the patience test is over. A future question that animates
something in JS *before* the answer would escape the governor — the fix would
be for it to consult the rate, not for the lens to chase it.

### P3 — Interactivity over multiple choice

Real quizzes are radio buttons. Here, answering should regularly *be an act*:
drag, pack, tune, rank, permit, wait. New input modes are a feature in
themselves (see the input-mode backlog in memory).

Built: pack-box (inventory-Tetris moving box), Q28 (drag planets on orbits), Q21
(iMessage QuickType), Q46 (equalizer faders), alphabet-subset (alphabet range sliders),
Q32 (balance scale), Q15 (budget builder), Q34/Q35 (drag-to-rank), Q23 (the
browser permission dialog *is* the input), scene-watch (an animated scene you
just *watch*, on a fixed window — the input is your attention, spent before you
know it will be tested).

### P4 — Tropes taken to the extreme

Take a question every personality quiz asks and turn the dial until it breaks:
longer ladders, pettier stakes, the logic followed all the way down.

Built: perfect-dinner (one $100 budget, every line tiered to the full $100 so
blowing it all on a chartered yacht with nothing to eat is a legal answer),
font/palette/button/wallpaper-taste → artistic-claim (the
"which font are you" trope, except your taste choices are *applied* to a later
question so you must live in the room you decorated), equalizer (the headphone-app
EQ panel, except on submit the background music genuinely adopts your curve and
keeps it for the rest of the quiz — the asteroid countdown and the final report
included, applied raw, so a maxed curve really does sound maxed).

The equalizer is enacted, not merely scored, and nothing announces it: per P6 the
quiz never says "as requested", it simply sounds different from the next question
onward. See docs/audio.md § Equalizer for why it sits on the music bus (so it
survives every track change) and why SFX stay uncoloured.

**light-or-dark** (`Q70DarkMode`, late chapter 4) takes the same trope one step
further: the quiz is paper on a desk and has no dark theme, so answering "dark
mode" darkens the *room* — on submit the lights ramp down and a vintage lamp
sputters on, HANGING above the stack's top-right corner (`LampOverlay`, a fixed
canvas vignette). The beam is a raked, asymmetric cone (focal-offset gradient:
sharp cut at the shade's rim, long spill down the table) and the fixture sways
like a slow pendulum — one theta drives the beam's tilt, the pool's position,
and a pair of CSS variables (`--lamp-on`, `--lamp-sway`) that make the paper's
re-aimed drop shadows (`.lamp-lit` in `+page.svelte`) sway in counter-phase.
The shadows have no CSS transition on purpose: the canvas clock is the only
timing source. It persists until the quiz ends — reaching the report brings the room lights back up over the same gradual dawn (never a cut from dark to bright) — and it is never mentioned.
Earlier answers tune the wiring: easy-or-hard 6/7 dims the bulb and schedules
blackouts (~10s / ~3s cadence), patience ≥6 stretches each blackout into a
2.5–4s outage, patience ≤2 skips the ramp entirely (the room cuts dark and the
lamp snaps on), and a Ko-fi pledge buys a warmer bulb that never blacks out.
The overlay is **post-answer JS animation by design** — the PatienceLens rule
(JS timing before the answer escapes the governor) does not apply, and the
question holds the screen until the entrance finishes. Reduced motion gets no
sputter, no wobble, no blackouts. No sound in this pass, deliberately.

### P5 — Hardballs among the softballs

The genre asks only softballs — "how do you relax?" — so this quiz
occasionally drops a trolley-problem-grade moral question with zero warning
and the same flippant axis scoring. The whiplash is the parody: an instrument
that can't tell the difference between your favorite font and the value of a
human life, because none of them ever could.

Built: Q35 (rank by value: 1 human / 10 dogs / 100 cows / 1000 cats).

Conventions for hardballs:
- **No premise softening.** Softballs get scene-setting; hardballs get asked
  like it's nothing.
- Land them directly after the fluffiest question available.
- Scoring stays flippant. Weighing a life still hands out "+3 risk" and a
  shrub at the end — that flippancy is the point, never fix it.

### The reveal cascade

Every question assembles in a readable order rather than fading in as one
block. `src/lib/reveal.js` owns the timing; `SplitText` reveals text **word by
word** (it used to be per letter, which turned prompts into a slow ransom note
at the patience chapter's 1/20th speed).

Build a question's timing with `cascade()` — each call returns the delay that
block should start at, and advances the clock:

```js
const seq = $derived.by(() => {
  const c = cascade();
  return {
    premise: premise ? c.text(premise) : 0,
    prompt: c.text(prompt),
    rule: c.rule(),
    cards: c.items(options.length),
    submit: c.action()      // ← always last
  };
});
```

**The rule that matters: an action button may not appear until everything
above it has finished arriving.** Otherwise "Submit" sits there fully legible
while the taker is still reading, which both spoils the reveal and invites
answering an unread question. `c.action()` is the only method that waits for
the true completion of everything staged so far; every other block overlaps
its predecessor slightly so the card feels continuous rather than staccato.

Consequences worth knowing:
- Timing is **derived from content**, so a long prompt automatically pushes
  the options and the button later. Don't hand-tune delays back in.
- Because delays are inline `animation-delay` values on real CSS animations,
  PatienceLens scales the whole cascade for free.
- Anything with its own entry animation needs `animation: … both` in CSS and
  an inline `animation-delay` from `seq` — the shorthand resets delay to 0, so
  the inline value is what actually orders it.

### P6 — Never break character

The certificate aesthetic, the `.premise` scene-setters, the "№" plate, the
interludes, the reveal animations: all of it performs institutional
seriousness. Humor comes from the gap between that performance and the
content. Anything that winks — emoji, self-aware copy, "just kidding" —
punctures it.

## Concept backlog (unbuilt)

The active concepts, each with question sketches. Reusable machinery named in
parentheses. Mark items built as they land. (Concept ids C1/C2/C5 are retired
— see *Rejected concepts* below — and are not reused, so old references stay
unambiguous.)

### Shared infrastructure: answer runtime (built)

`QuestionRuntime.svelte`, `SubmitAnswer.svelte`, and `metrics.svelte.js` form
one session-local answer system. Manual controls publish typed drafts and never
advance on the first selection; a separate Submit action commits them. Each
attempt records presentation readiness, first interaction, semantic draft
changes, revisions, submit and validation attempts, focus dwell, input
modality, hidden-tab time, and the final response. Automatic browser and timed
scenes use the same record with explicit outcome formats. Cross-question checks
read submitted responses through `latestResponse()` and tolerate a missing
deep-linked answer. Development builds expose cloned snapshots at
`window.__quizMetrics`; nothing is persisted or transmitted.

An answer revision is deliberately input-specific. Switching a single-choice
answer counts after the first pick. A scalar slider counts only when movement
reverses direction. Dinner allocations never count revisions. Multi-selects
allow new selections for free until the first deselection, then every later
toggle counts. Rankings normalize drags and arrow presses to adjacent-position
distance and allow `n(n−1)/2` free steps—the distance required to reverse the
whole list—before each further move counts.
Forward typing does not count as reconsideration; every Backspace in a text
answer counts once, including private fields whose actual contents are never
stored.

### C3 — Measuring behavior, not answers

The observer effect as content. PatienceLens does this covertly; these do it
out loud. All three read the ledger.

- **The sandwich timer.** *"Pick a sandwich for lunch."* Four sandwiches that
  are deliberately near-identical (turkey, ham, chicken, roast beef) so
  deliberation is absurd. The pick is silently timed; the next card says
  only: *"You spent 41.3 seconds choosing between four sandwiches."* — one
  decimal place, C8 crossover — with options like "That's fair" / "They were
  very different sandwiches". Deep-linked (no timing recorded): the card
  reads *"You chose a sandwich. We didn't see how long it took. We assume it
  took a while."*
- **Hover betrayal.** A PickList variant times cursor dwell per option; the
  longest-dwelled *unpicked* option (over a ~2s threshold) is remembered.
  Later: *"Earlier you hovered over 'X' for six seconds and did not choose
  it. What stopped you?"* On touch, or if nothing crossed the threshold, the
  later question silently swaps to a neutral filler — the bit only fires on
  people it actually caught.
- **The second patience test.** A card reading only *"Please wait."* — no
  spinner, no progress, just a small continue link styled like footer text.
  The score is how long they wait before taking it. This deliberately
  re-measures what Q29 asked them to self-report, which makes it prime
  evidence for a C4 contradiction callout ("You described yourself as a 6/7
  for patience. You waited eleven seconds.").

### C4 — The quiz doubts you

Open disbelief as a mechanic; the confrontational face of P2.

- **"Really?"** An interstitial in interlude dress, triggered by specific
  flagged options (the smug ones: "not moving at all", returning all $400).
  Two buttons: "Yes." and a smaller "Let me reconsider" — reconsidering
  re-asks the question *with the original choice removed*.
- **Confidence regress.** After a hard question: *"How confident are you in
  your previous answer?"* (0–100 slider) → next: *"And how confident are you
  in that estimate?"* → a card stating, deadpan: *"Effective confidence:
  61% × 43% = 26.2%."* (C8 crossover; the arithmetic is real.)
- **Contradiction callout.** Reads the ledger for a curated pair (e.g. Q1
  "center of the conversation" vs Q3 "time alone"), quotes both answers
  verbatim in quotation marks, and asks *"One of these was a lie. Which?"* —
  options: each quote, "Both", and "People are complicated". The
  fallback is the best part: if the taker's answers *don't* conflict, the
  card instead says *"Your answers so far are perfectly consistent. What are
  you hiding?"* — no dead path, both branches are jokes.

### C6 — Push-poll: the quiz has an agenda

Leading questions, as parody of instruments that steer. Strongest if the
push always favors the same pole — the quiz quietly wants everyone to come
out a bold extrovert (`risk` and `social` positive), and a taker who notices
can start resisting on purpose.

- *"Wouldn't you agree that adventurous people are simply more interesting?"*
  Options: "Yes", "I suppose so", "That's fair", and a visually tiny "no".
- One option arrives pre-selected "for your convenience" (PickList variant
  prop). Submitting it unchanged scores compliance; changing it costs a
  click and scores independence.
- *"73.4% of the 40,000 people who took this quiz chose B."* B is
  objectively the worst option. Picking B anyway is its own personality.
- Styling bias: one option typeset beautifully in display serif, the rest
  cramped grey 0.7rem (the Q16–Q20 design machinery makes this cheap).

### C7 — Premature typing

The quiz profiles you off one data point and never lets go — "which Hogwarts
house are you" typing-from-nothing, escalated.

- The seed is already planted: Q38's fridge pick. A `typedState` module maps
  it to a Type — Apple Person, Banana Person, BLT Person, Protein Person —
  each with an invented trait table the quiz treats as settled science.
- Occurrence 1 (a few questions later): *"As an Apple Person, you naturally
  value discipline. How do you take your coffee?"*
- Occurrence 2: the trait escalates — *"Apple People are natural leaders in
  emergencies. A fire starts in your building. Who do you save first?"*
  (P5 crossover: the hardball hidden inside the bit.)
- Occurrence 3: *"Apple People rarely lie. Were you lying just now?"*
- Deep-link fallback: "As an Unclassified Person…" — still in character.

### C8 — Meaningless precision

Quantification absurdism; Q44's unit conversions are the seed.

- *"How much do you agree with statements like this one?"* — 1–7 slider.
  (Likert parody and self-reference in one.)
- **The bread slider.** 0–1000 with a live readout to three decimal places
  (*"How much do you like bread?"* → 612.407), plus ±0.001 fine-tune buttons
  for people who need 612.408. The decimals genuinely track subpixel pointer
  position, so they jitter — precision theater with real precision.
- Allocate exactly 100 points across Mind / Body / Soul / Other
  (BudgetBuilder reuse; "Other" winning is a legitimate personality).
- The C4 confidence-multiplication card belongs to this family too.

### C9 — Hardball drops (P5 build-out)

More trolley-grade questions in softball costume.

- **The trolley diagram.** Drawn in Q47's pictogram signage style — five
  figures on one track, one on the other — and the input is dragging the
  lever itself (no buttons). Keep it abstract: pictogram figures, no gore,
  the trolley simply proceeds off-canvas after the choice, and the score is
  a flippant "+3" like always (per the P5 convention).
- **The lifeboat allocator.** *"The lifeboat holds three."* BudgetBuilder
  reuse where the budget is seats: you, a doctor, a child, your dog, a
  stranger who is probably a better person than you. Interactive hardball —
  P3 and P5 in one question.
- *"You find a wallet holding $400. The ID shows the owner is wealthier than
  you. How much do you return?"* (SliderPick, $0–$400 in exact dollars —
  precision crossover, and prime "Really?" bait for C4.)
- *"Your ideal weekend getaway?"* — one option quietly contains an
  irreversible moral trade.

### C10 — Hypothetical vs. actual (the ask-then-bill pair)

A two-question set, and the third instance of the quiz's strongest recurring
device: **make a claim cheap, then charge for it.** (The other two are live:
honesty-claim honesty claim → found-wallet wallet, and easy-or-hard challenge claim → math-test math test. Worth
treating as a named pattern rather than reinventing it each time.)

1. *"Hypothetically, how much would you donate to the creator of this quiz?"*
   — plain PickList, nothing at stake: **$0.10 / $10 / $20**.
2. If they pledged: *"Practically, how much will you be donating?"* — the same three options,
   except each one is a real **Buy Me a Coffee** link that opens the actual
   payment window.

The gap between the two answers is the whole joke, and it wants the ledger
(`logAnswer('q…', { index })`) so a later screen can name the discrepancy —
this is prime C4 "Really?" bait.

**On verifying the donation actually happened — asked, and the honest answer
is no, not client-side.** The BMC checkout is cross-origin, so a popup gives
back no signal at all: no `postMessage`, no readable state. Real verification
needs a backend — BMC webhook → your server → the quiz polls it — and even
then you have to correlate a payment to *this browser session*, which BMC has
no clean way to carry (you'd be reduced to asking the donor to type a code in
the support message). This repo is a static SvelteKit build with no server, so
that's a disproportionate amount of machinery for one gag.

Two options that need none of it, both funnier:

- **Just claim to have checked.** *"We'll know."* → next question →
  *"You didn't."* The quiz asserting knowledge it cannot possibly have is
  exactly P2/C4, and it costs nothing to build.
- **Detect only the return.** `visibilitychange` tells you they left the tab
  and came back. That proves nothing about payment — which is the point: the
  quiz can treat leaving-and-returning as proof and be smugly, confidently
  wrong.

Never actually gate progress on payment. A quiz that won't continue until you
pay stops being a joke about donation asks and becomes one. If they declined
the hypothetical donation, the follow-up stays inside the quiz and asks what
would motivate them to donate instead; it never shows the real Ko-fi controls.

### C11 — Paying off the location permission

**location-permission already requests real geolocation and then throws the coordinates away
unread** (`Q23Permission.svelte`: "The position itself is discarded unread —
only the allow/deny choice matters"). Keeping the fix instead, for one later
question, is a payoff sitting right there.

The unsettling beat is not asking for location — everything asks. It's the
quiz *quietly still having it* twenty questions later, stated as a flat fact
in the middle of an unrelated question.

Directions, all computable offline from a lat/long with no API and no network
call — which matters, because this must stay a local-only trick:

- **Distance to something absurd,** by haversine against a hardcoded point.
  *"You are 6,281 km from the nearest active volcano. Does that feel like
  enough?"* A distance to D. B. Cooper's drop zone would call back to balance-scale.
- **A scale question re-expressed in their own geography.** *"How far would
  you travel for a genuinely perfect meal?"* — with the slider labelled in
  real distances from where they actually are.
- **Nearest-city match** against a small hardcoded table, so the quiz names a
  place without any reverse-geocoding service.

Constraints for whoever builds it:

- **The coordinates must never leave the browser.** Session memory only, no
  network, no persistence. The current "discard unread" stance is a deliberate
  privacy choice, and relaxing it needs to stop at "kept in a `$state` module
  for the rest of this run".
- **Most people deny.** The question has to work as a standalone with no
  location at all — same contract as every other ledger consumer — with the
  location version as the enriched path, not the only path.
- Denying and then being told a distance anyway would be a great gag but is a
  lie the quiz can't back up; better that denial simply gets the plain
  version.

### C12 — Time as evidence (built)

Every question is timed by the shared runtime. The time audit consumes decision
time after presentation readiness, subtracts hidden-tab time, and excludes
timed scenes plus patience-altered delivery. The decision audit uses semantic
draft revisions from the same records.

It is the purest form of P2: a personality quiz that only reads your answers is
taking your word for it. How long you took is the one signal you cannot
consciously curate, and it is free — we just have to look.

**Measure in the runtime, not in questions.** `QuestionRuntime` owns the
question lifetime and `handleAnswer` closes the current attempt, so new formats
inherit measurement without another timer.

Five things that will corrupt the number if not handled:

- **The animate-then-advance tax.** Submit time is captured before a component's
  delayed transition and before it can unmount, so post-answer animation never
  inflates decision time.
- **PatienceLens.** It scales a whole chapter's animations to ×0.05 — about 20
  seconds before a question is even readable. Timing inside that chapter measures
  the lens, not the person. Exclude the chapter, or subtract arrival time.
- **Tab-away.** `visibilitychange` pauses the measured decision clock.
- **Questions are not comparable.** Q52's calculus, a four-option pick, and
  Q47's reaction test have wildly different honest durations, and a longer
  `.premise` legitimately takes longer to read. A raw average across questions
  is meaningless. Score the **deviation from a per-question baseline** —
  authored expected seconds, or estimated from word count — never the absolute.
- **Use a robust statistic.** Median of per-question deviations, not the mean:
  one bathroom break shouldn't outvote forty honest answers.

**Where it lands in scoring.** `tempo` (Long & steady ↔ Quick-action) is the
obvious axis, applied **once at the end** as a single ±2–4 adjustment, in line
with the existing "evidence outweighs claims" convention — not as per-question
noise. `scope` is a plausible secondary (deliberation reads as detail-oriented).

**The best use is the contradiction.** Q29 asks the taker to rate their own
patience. The measured time is evidence about the same trait, gathered without
asking. When the claim and the clock disagree, that's an honesty hit — the same
shape as honesty-claim→found-wallet and easy-or-hard→math-test, except derived from behavior rather than from a
second question. That is the version worth building first.

Deep-links and replays leave gaps; a missing duration is skipped, never guessed
(the standing metrics contract). And the results page can state the finding with
meaningless precision — *"You averaged 8.3 seconds per question."* — for a free
C8 crossover.

## Removed questions

Questions that shipped and were later cut. **Log every removal here with its
reason** — the point is that a cut question stays cut. Without a record, a
question that failed for a structural reason gets cheerfully reinvented six
weeks later, because the idea still sounds fine in isolation; what killed it
was never the idea.

Ids are never reused (see the note on `flowOrder` in
`src/lib/questions/index.js`).

| Question | Why it was cut |
| --- | --- |
| `big-decision` — gut / pros-and-cons / ask around / delay | Removed from the opening chapter at product direction; it was a generic pick-one prompt and the surrounding questions already teach that interaction. |
| `planet-alignment` — arrange the planets | Removed because the interaction was effectively impossible to solve and read as punishment rather than a revealing challenge. |
| `metrics-audit` — agree with the displayed answer statistics | Removed to make room for a more visual behavioral callback. Its replacement uses the taker's pointer trail rather than presenting a numeric instrument panel. |
| `chat-exit` — choose what comes to mind after someone leaves a group chat | Retired because its bonus depended on the earlier argument-replay wording, and its reused phone interface was too similar to the breakup-text question to earn another slot. The component is preserved for the retired-question gallery. |
| `ideal-residence` — submarine / blimp / space station | Cut during the chapter-3/4 pass. **Reason not recorded — fill this in.** Note it was the anchor for the "Thank you for your patience." interlude, which had to be re-pinned to `coffee-prompt`; that interlude bounds the patience lens, so it must always follow the LAST question of chapter 3. |
| `flooded-building` — fifty floors underwater, how do you get groceries | Cut during the chapter-4 pass. **Reason not recorded — fill this in.** |
| `dinner-budget` — Friday-night budget ladder | Too generic. It belongs in chapter 1 if anywhere, and chapter 1 is already full. Chapter 2 is reserved for questions with a **visual** element, which this had none of. |
| `picnic-fridge` — which fridge item to grab | Collateral of moving `memory-claim` to slot 1. Its only job was planting four items for `recall-trap`, and `recall-trap` now tests the exact wording of question 1 instead, so the plant had nothing left to do. |
| `rorschach` — Perlin-noise inkblot, "what do you see?" | Too basic. It is literally noise: no right answer, no claim to test, and nothing for a later question to hang off — one laugh and then nothing. Replaced by the scene-recall pair, which does the job it could not, in that it gives a later question something to ask about. Its `src/lib/perlin.js` went with it, having no other consumer. |
| `scene-note` — "how many questions have you answered?" (the non-prospective branch), or a delayed door-colour re-ask (prospective) | Too basic. The default branch was a plain counting question, and the prospective branch just re-asked the door colour that `scene-recall` already collects — so the whole question earned its slot on the strength of a delayed-prospective idea that the immediate probe already covers. Cut; prospective is now tested in place in `scene-recall` like every other faculty. |
| `ideal-income` | Everyone answers the maximum. A question where the entire population picks one option discriminates nothing, whatever it costs to render. |
| The 100-storey apartment question | Same failure as `ideal-income` — everyone picks the top floor. |
| The absurd reprises (three questions parodying earlier ones, e.g. "delay your gut") | Not funny enough to earn their slots, and redundant with the questions they were reprising. |
| "How likely are you to stop and help?" | Cut during the chapter-1 walkthrough. |
| Three early chapter-1 questions (originally Q4, Q5, Q8) | Cut during the chapter-1 walkthrough as weak; no specific reason recorded at the time. |

Note the recurring pattern in the top four: **a question that everyone answers
the same way is dead weight.** Before adding a question with an obvious
maximal answer, work out what stops people from simply picking it.

## Rejected concepts

Considered and deliberately not pursued — don't re-propose these:

- **Pseudo-scientific theater** (was C1: fake p-values, calibration
  questions, consistency meters). Rejected because it only really pays off
  on the results page — it decorates the ending instead of generating
  questions, and the quiz's comedy has to live in the questions.
- **The Barnum / Forer trap** (was C2: the flattering profile that fits
  everyone). Rejected as overused — it's the most-cited fact about
  personality quizzes, so replaying it reads as cliché rather than parody.
- ~~**Terms & conditions bureaucracy**~~ (was C5). Originally rejected —
  "nobody reads the terms" is a worn-out internet joke. **Revived as
  `terms-consent`, placed immediately after `memory-claim`** so it reuses the
  same five-point Likert row the taker just answered — a four-thousand-word
  contract wearing the costume of the innocent survey item before it. The gag is
  not that the terms are long, it's clause 5.4, which asks for a dollar in the
  same flat voice as the indemnity clause either side of it. The scroll gate is
  the actual target — being *made* to scroll past something is treated by
  the whole industry as having been informed of it. Keep the document
  unstyled and the clause unemphasised; the moment anything winks, it
  collapses back into the joke that was rejected.

## Scoring (v1, live)

Seven signed temperament axes, defined in `src/lib/scoring.js` (`AXES`):
social (Introvert↔Extrovert), honesty (Dishonest↔Honest), creative
(Pragmatic↔Creative), risk (Cautious↔Risk-taker), scope
(Detail↔Big-picture), tempo (Steady↔Quick), coord (Lone wolf↔Team-player).
Score objects carry axis keys ALONGSIDE the four legacy trait keys
(dual-track); the result page shows the archetype plus a diverging-bar
temperament profile.

Conventions when scoring a new question:

- Ordinary options: axis magnitudes 1–3. Cross-checks and behavior: ±2–4
  (evidence must outweigh claims).
- **tempo is about time, risk is about stakes; social is appetite for
  people, coord is method of getting things done.** Keep them distinct.
- `honesty` moves on evidence: cross-question checks, cheating options,
  candid confessions (±1 flavor only).
- Cross-question checks so far: patience claim → lens chapter survival
  (+page.svelte, ±4), taste picks → Q20 artistic claim, Q39 recall → Q40
  memory claim, Q48 honesty claim → Q49 wallet (double-lie −3), Q1/2/4 pick
  index → Q41–43 reprise consistency (±1). Submitted answers and behavior live
  in `src/lib/questions/metrics.svelte.js`; readers use `latestResponse()` and
  must handle missing entries.
- **The 128 types (live)** — `src/lib/personalities.js`. Threshold: value ≥ 0
  → positive pole. Each type has a 7-letter code in AXES order (E/I · H/D ·
  C/P · B/W · G/F · Q/S · T/L — no letter pair repeats), a compositional
  title `The [Self-Described]? [Sudden|Patient] [Gregarious|Quiet] <Noun>`
  (16 nouns from creative × risk × scope × coord: Impresario, Visionary,
  Showrunner, Inventor, Commander, Gambler, Operator, Daredevil, Curator,
  Dreamer, Artisan, Miniaturist, Steward, Strategist, Quartermaster,
  Archivist), and a **hand-written blurb** (all 128 individually authored).
  Blurb house rules: second person, certificate register, 30–60 words, all
  seven poles reflected, dishonest (D) blurbs undermine the taker ("we print
  your version, since you seem attached to it"), no two blurbs in a noun
  group share an opening.
- **The reading** (`src/lib/readings.js`, all 128 individually authored) is
  the second paragraph under the blurb — the one where the examiner sets the
  rubric aside and says what they actually saw in you as a human. Rules:
  45–80 words; **interpretation, not inventory** — lead with the 2–3 traits
  that dominate the type and describe life consequences (the seven-pole rule
  deliberately does NOT apply); axis vocabulary is banned, describe behaviour
  instead; no two readings in a noun group open with the same word; a reading
  never reuses its blurb's joke and never contradicts its facts; D readings
  humanise the self-mythology the blurb mocks — no flattery, no cruelty.
  `npm run verify:readings` enforces the mechanical rules.
  `typeOf(scores)` → `{code, title, blurb, reading, plant}`.
- **The plant.** The result card's headline identity is **not** the title —
  it is a **plant**, shown as a mounted specimen plate (photograph, common
  name, binomial in italic) with **no explanation of any kind**. That refusal
  is the joke: seven axes of elaborate measurement resolve into "you are a
  *Hydnora africana*," stated flatly. `plantFor(code)` reads the type code as
  seven bits → an index into `PLANTS`, so the mapping is a bijection, stable
  per type, and entirely arbitrary — **the order of the plants list IS the
  mapping**, so reshuffling that list re-rolls every assignment.
  `titleOf`/`NOUNS` remain in personalities.js (they document how the blurbs
  are grouped, and suit share text later) but are no longer rendered.

## Image credits

Plant photographs come from Wikimedia Commons via `scripts/fetch-plants.mjs`
(re-runnable, idempotent). **Every image requires attribution and gets it**:
author, license name, license URL where one exists, and a link to the Commons
file page — shown beneath the photograph on the card and mirrored in
`CREDITS.md`. Licenses vary per image (mostly CC BY-SA at assorted versions,
some CC BY, some public domain), so never hardcode one.

Images are stored **unmodified** and sized with CSS only (`object-fit:
contain`, no cropping), so no derivative is distributed and the ShareAlike
terms are never engaged. If you ever bake in a crop or filter, that changes.

Two older images predate this rule and have no recorded provenance:
`static/sailing-lantern.jpg` (a vendor product shot) and
`static/images/elevator-doors-signs/run-v2.png`. Worth resolving before any public
deployment.
- **The live meter** (`src/lib/TemperamentHud.svelte`): all seven axes as a
  compact strip of read-only faders fixed to the bottom of the viewport
  during the quiz — the instrument flaunting its math while it judges you.
  Deliberately minimal: no title, no curve — tracks/thumbs/zero-line with
  tiny pole emoji above and below each fader (defined on `AXES` in
  scoring.js as `posEmoji`/`negEmoji`), rendered grayscale so they read as
  print; hovering/tapping a column colors its pair and fills the single
  centralized readout line (both pole names + signed value). Desktop opens
  by default and collapses to a slim tab; under 560px it's a summonable
  bottom sheet. Values renormalize smoothly against the current extreme. It
  renders from `AXES`, so new axes appear automatically. The grayscale
  emoji are the sanctioned exception to the no-emoji rule — glanceable
  iconography, desaturated to stay deadpan.

## Pointers

- Lore arcs, absurd reprises, sequence-coupled questions, cross-question
  `$state` conventions: `docs/lore.md`.
- Absurdity curve (questions ~1–10 normal, ramping to full joke by ~50) and
  the input-mode idea backlog: session memory notes (`pq-absurdity-curve`,
  `pq-input-mode-ideas`).
- The curve is implemented as four bands in `flowOrder`
  (`src/lib/questions/index.js`): normal content/simple inputs → mild oddity
  and richer widgets → mechanism gotchas and absurd content → full joke,
  payoffs and finale. Interludes (`src/lib/interludes.js`, pinned to question
  ids) mark the chapter boundaries and double as functional bounds (patience
  lens; the hide-brush paint is permanent instead). Build-up questions (honesty-claim honest, rank-satisfying tame rank) sit far
  ahead of their payoffs so the pairing never telegraphs — except easy-or-hard → math-test
  (challenge claim → sized math test), deliberately adjacent so the karma is
  instant; ids are permanent (id = filename number = ledger key), № is
  positional.
