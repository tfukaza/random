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

## The six pillars

Every question should serve at least one. Canonical built examples cited.

### P1 — Absurd questions, asked straight

Scenarios no sane instrument would pose, phrased with the gravity of a census
form. The absurdity is in the premise, never in the delivery.

Built: Q24 (permanent residence: submarine / blimp / space station), Q45
(fifty floors of your building are underwater; how do you get groceries), Q36
(would you buy this $4,800 lantern — name and price only), Q9 (one meal a
year), Q10 (which floor of 100).

### P2 — The quiz validates you

Personality quizzes take your self-report at face value. This one **tests
it**. Claims made in one question become claims examined by a later one — the
quiz is running its own replication study on you, and it is not impressed.

Built: Q29 → PatienceLens (you *said* you were patient; every following
question in the band is now delivered at the speed you claimed to want), Q38 → Q39 → Q40
(a throwaway list becomes a memory exam, then a pointed self-assessment where
one word — "actually" — appears only for those who failed).

**How PatienceLens scales time** (`src/lib/PatienceLens.svelte`). It cannot
read the question it wraps — questions are arbitrary components with no shared
text or option schema — so it works on the *animations* instead. Every
pre-answer animation in this app is CSS, so `host.getAnimations({subtree:
true})` returns all of them (transitions included) and setting each one's
`playbackRate` scales its whole timing, delays and staggers alike. Claim 6–7
and the band runs at **×0.05 — about 20 seconds for a question that normally
arrives in ~1.25s** — with pointer events off until it finishes, because
elements fading in from `opacity: 0` are otherwise invisible but clickable.
Claim 1–2 and you still get the blur flash. The № marker lives *inside* the
lens in `+page.svelte` precisely so it is governed too.

Three things to preserve if you touch it: grip the animations **on mount, not
on `animationstart`** (a CSS animation is returned during its delay phase, so
catching it at mount scales the delay; `animationstart` fires after the delay
has already run at full speed); exclude infinite animations from the
arrival check or a looping decoration will hold the question forever; and fail
open when `getAnimations` is missing, or the taker is stranded on a question
they can never answer.

JS-driven timing (`tweened`, `setTimeout`) is deliberately **not** scaled. In
this band every such timer fires only after an answer is given, and once you
have answered the patience test is over. A future question that animates
something in JS *before* the answer would escape the governor — the fix would
be for it to consult the rate, not for the lens to chase it.

### P3 — Interactivity over multiple choice

Real quizzes are radio buttons. Here, answering should regularly *be an act*:
drag, pack, tune, rank, permit, wait. New input modes are a feature in
themselves (see the input-mode backlog in memory).

Built: Q26 (inventory-Tetris backpack), Q28 (drag planets on orbits), Q21
(iMessage QuickType), Q46 (equalizer faders), Q25 (alphabet range sliders),
Q32 (balance scale), Q15 (budget builder), Q34/Q35 (drag-to-rank), Q23 (the
browser permission dialog *is* the input).

### P4 — Tropes taken to the extreme

Take a question every personality quiz asks and turn the dial until it breaks:
longer ladders, pettier stakes, the logic followed all the way down.

Built: Q5 (income ladder into absurdity), Q6 (dinner budget ladder), Q37 (the
where-would-you-live question as a pure density gradient), Q16–Q19 → Q20 (the
"which font are you" trope, except your taste choices are *applied* to a later
question so you must live in the room you decorated).

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
at the patience band's 1/20th speed).

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

### Shared infrastructure: the ledger

C3 and C4 both want a small **answers-log state module** —
`ledger.svelte.js`, recording per answered question: id, the label of what
was picked, and elapsed answer time (`performance.now()` delta — **specified
here but not yet implemented; see C12** for the plan and its pitfalls). Same
`$state` pattern as `recallState`; consumers must handle the
empty/deep-linked case. Build it with the first C3/C4 question and every
later doubt/behavior question gets cheaper.

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
q48 honesty claim → q49 wallet, and q51 challenge claim → q52 math test. Worth
treating as a named pattern rather than reinventing it each time.)

1. *"Hypothetically, how much would you donate to the creator of this quiz?"*
   — plain PickList, nothing at stake: **$0.10 / $10 / $20**.
2. *"Practically, how much will you be donating?"* — the same three options,
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
pay stops being a joke about donation asks and becomes one.

### C11 — Paying off the location permission

**q23 already requests real geolocation and then throws the coordinates away
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
  enough?"* A distance to D. B. Cooper's drop zone would call back to q32.
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

### C12 — Time as evidence (score the clock, not just the answer)

**Time every question and let it move the final score.** The ledger section
above specifies an elapsed-time field, but nothing records one today — the
live entry shape is `{ index?, value?, label? }` and no question or orchestrator
writes a duration. This is the plan for actually doing it.

It is the purest form of P2: a personality quiz that only reads your answers is
taking your word for it. How long you took is the one signal you cannot
consciously curate, and it is free — we just have to look.

**Measure in the orchestrator, not in questions.** `+page.svelte` is the only
place that knows when a question appeared and when it answered; putting a timer
in each question means implementing it 54 times and forgetting it on the 55th.
Stamp on question mount, diff in `handleAnswer`, write to the ledger.

Five things that will corrupt the number if not handled:

- **The animate-then-advance tax.** Every question deliberately waits before
  calling `onAnswer` — 520ms in PickList, 900ms in Q28/Q32, 2600ms in Q22. A
  raw mount→answer delta measures our animation as much as their thinking.
  Either subtract a per-question constant (fragile) or time to *first
  interaction* — which is what `onPick` already is, though it only exists on
  PickList/ButtonPick/PalettePick, not on sliders or drag questions. Extending
  a "first touch" signal to the shared input helpers is the cleaner fix.
- **PatienceLens.** It scales a whole band's animations to ×0.05 — about 20
  seconds before a question is even readable. Timing inside that band measures
  the lens, not the person. Exclude the band, or subtract arrival time.
- **Tab-away.** Someone who makes a coffee mid-question must not read as deep
  deliberation. Cap per-question time, or pause on `visibilitychange`.
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
shape as q48→q49 and q51→q52, except derived from behavior rather than from a
second question. That is the version worth building first.

Deep-links and replays leave gaps; a missing duration is skipped, never guessed
(the standing ledger contract). And the results page can state the finding with
meaningless precision — *"You averaged 8.3 seconds per question."* — for a free
C8 crossover.

## Rejected concepts

Considered and deliberately not pursued — don't re-propose these:

- **Pseudo-scientific theater** (was C1: fake p-values, calibration
  questions, consistency meters). Rejected because it only really pays off
  on the results page — it decorates the ending instead of generating
  questions, and the quiz's comedy has to live in the questions.
- **The Barnum / Forer trap** (was C2: the flattering profile that fits
  everyone). Rejected as overused — it's the most-cited fact about
  personality quizzes, so replaying it reads as cliché rather than parody.
- **Terms & conditions bureaucracy** (was C5: the unread-T&C gag). Rejected
  — "nobody reads the terms" is a worn-out internet joke. (The *initials
  box* input mode from this idea is still fair game if a question ever needs
  a signature; it's the T&C framing that's retired.)

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
- Cross-question checks so far: patience claim → lens band survival
  (+page.svelte, ±4), taste picks → Q20 artistic claim, Q39 recall → Q40
  memory claim, Q48 honesty claim → Q49 wallet (double-lie −3), Q1/2/4 pick
  index → Q41–43 reprise consistency (±1). Shared answers log:
  `src/lib/questions/ledger.svelte.js` — write via `logAnswer`, readers must
  handle missing entries.
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
  group share an opening. `typeOf(scores)` → `{code, title, blurb, plant}`.
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
`static/images/q47-signs/run-v2.png`. Worth resolving before any public
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
  ids) mark the band boundaries and double as functional bounds (patience
  lens, q53 seep). Build-up questions (q48 honest, q34 tame rank) sit far
  ahead of their payoffs so the pairing never telegraphs — except q51 → q52
  (challenge claim → sized math test), deliberately adjacent so the karma is
  instant; ids are permanent (id = filename number = ledger key), № is
  positional.
