# Lore arcs

Not every question is standalone trivia. Some are threaded onto a **story arc** — a
character's situation that progresses across several questions, so a player who goes
through the whole quiz feels a life unfolding rather than a survey.

Rules of thumb:

- **Not everything needs lore.** Standalone questions (fonts, palettes, illusions,
  favorite meal) are the connective tissue between arcs. Aim for arcs to be a minority —
  a good number of questions should stay plainly neutral, with no story attached.
- **Some questions are deliberately neutral — leave them alone.** Q16 (font), Q17
  (palette), Q18 (button), Q19 (wallpaper) and Q20 (artistic side) are intentionally
  context-free preference questions. They have been considered for arc framing and
  explicitly kept plain. Don't convert them.
- **Questions are referenced by id, placed by `flowOrder`.** Every question has a
  permanent id (`'q11'` = its filename number = its ledger key) in the registry in
  `src/lib/questions/index.js`; play order is the `flowOrder` manifest in the same
  file, and the displayed № is just the position there. Cross-references (ledger,
  `interludes.js`) always use ids, so reordering is editing `flowOrder` and nothing
  else.
- **Scene arcs should be adjacent** in `flowOrder`. Consecutive questions let a
  premise carry without re-explaining it (zombie: q26 → q27). The exception is a
  recurring-obstacle arc like the delivery driver, whose beats each re-establish
  in one line (q13, q54) — those may spread out so the courier keeps resurfacing
  deeper into the absurdity curve.
- **Establish, then assume.** The first question of an arc sets the scene in a short
  muted lead-in paragraph (see `Q26Backpack.svelte` `.premise`); later ones assume it
  and get straight to the situation.
- **Arcs may share state.** Q26 → Q27 is the working example: the backpack contents
  chosen in Q26 become the answer options in Q27, via `backpackState.svelte.js`.
  Shared state lives in a `*.svelte.js` module with `$state`, written by the earlier
  question and read by the later one; always handle the empty/deep-linked case.

---

## Arc 1 — The zombie apocalypse

A survivor roaming a depopulated world, scavenging and looking for other people.

**Deliberately light.** Don't over-elaborate this one — no elaborate mythology of how
the outbreak happened, no factions, no named characters. It's a backdrop for
resource-scarcity and who-do-you-help decisions, not a story to be told.

Current questions:

- **Q26 Backpack** — establishes the premise; pack a 3×4 inventory grid from a supply
  shelf, more supply than space.
- **Q27 Survivor** — you find a wounded survivor you can't carry; give him one item
  from what you packed.

Room to grow: shelter choices, rationing, whether to travel with others, what you'd
do about a bite.

## Arc 2 — The embezzler on the run

A corporate executive who just embezzled tens of millions from their own company. The
company took it personally and hired a hitman. Now they're on the run — enormous
liquid wealth, no safety, no one to trust.

The appeal: money is no longer a constraint but is also useless for the thing that
matters (staying alive), which makes for questions where extravagant and paranoid
answers both make sense.

Threads worth mining: what you do with money that can't be spent normally; how much
you trust a stranger who's too helpful; whether you keep contact with anyone from your
old life; how you pick where to sleep; what you'd give up to be safe again.

Existing standalone questions that could be pulled into this arc (they already share
its texture — wealth, hiding, paranoia):

- **Q5 Income** and **Q6 Dinner** — the wealth ladder.
- **Q23 Permission** — a browser asking for your location hits differently when someone
  is hunting you.
- **Q24 Residence** — submarine / never-landing blimp / space station reads as
  "where do you disappear to?"

## Arc 3 — The delivery driver

A courier with one order to deliver and an unreasonable, unshakeable commitment to
delivering it. Increasingly absurd obstacles pile up. Quitting is never on the table.

**They are on a bike**, established in Q13 — the order rides in a bag on their back, not
in a passenger seat. Keep it that way: the bike is what makes stopping cheap, so every
refusal to stop is a real choice rather than a logistical one. It also rules out
car-shaped obstacles (no breakdowns, no parking, no traffic jams you can hide behind).

Tonally the comic relief of the arcs: the humor comes from the courier treating
genuinely serious events (a flood, a car chase, the end of the world) as logistics
problems that must not delay the drop-off.

This arc has the most repeatable question shape: **each question is one obstacle**, and
the options are ways of getting through it. Escalate as the arc goes — a wrong address,
then a shredded tyre, then weather, then something that shouldn't be survivable — and
never offer "give up" as an option. Keep the food getting colder as a running gag.

The scoring angle: options can differ by *how* you push through — improvise a fix
(`creative`), take the route nobody sane would (`risk`), reason out the optimal call
(`scope` toward detail), or get someone else to help you (`coord`).

## Arc 4 — The lost dog

Someone whose dog got out, walking the neighborhood looking for it. Flyers on poles,
checking the shelter, calling a name into a park at dusk.

**The calm arc.** No threat, no antagonist, no clock beyond daylight. Where the other
arcs escalate, this one just continues — and that steadiness is the point of having it
in the mix.

Keep it **gentle and hopeful**. The subject matter could easily go bleak, so don't let
it: no grim discoveries, no confirmation of the worst. The texture is strangers being
kind — a neighbor who thinks they saw something, a kid who helps look, someone who
takes a flyer and actually calls. If the arc ever resolves, resolve it warmly.

What it's really asking underneath: how much of your life do you put on hold for hope?
That plays out in small practical choices — what goes on the flyer, how big the reward
is (and what it says about you either way), how far past your own neighborhood you'll
go, whether you chase a vague sighting across town, when you let yourself go to bed,
who you ask for help, what you say to the person who suggests you should accept it.

Good beats: making the flyer, the first false sighting, the shelter visit, a dog that
looks like yours but isn't, deciding whether to leave your old sweatshirt on the porch.

---

**Shelved ideas** (dropped from the active arc list, kept in case they're wanted later):

- *The reluctant employee* — someone who wants to do nothing, gets kicked out of their
  parents' house, takes a job under protest. Replaced by the lost-dog arc as the calm
  slot. Its options would be a gradient of avoidance rather than effort, with no "rises
  to the occasion" answer ever offered.
- *The teleportation scientist* — invented a working teleporter; the Illuminati, who
  gatekeep humanity's technological progress, try to erase him and it. Dropped because
  it overlaps too heavily with the embezzler arc: both are "hunted person with a secret
  on the run," and running them together would make the quiz feel repetitive rather than
  varied. If it ever comes back, the *disclosure* half (how do you reveal something when
  your opponents own every channel?) is the part the embezzler arc doesn't already
  cover.

## Arc 5 — The aspiring artist

Someone trying to sell their paintings. No villain, no countdown — the stakes are a
booth at a weekend market, a gallery that hasn't replied, and whether anyone stops to
look. Small and sincere.

**Keep this one warm.** The other arcs run on threat; this one runs on hope and mild
indignity, and it's the register to reach for when the quiz needs to breathe. Nothing
catastrophic should happen. The tension is entirely internal.

What makes it generate good questions is that every decision is a self-worth question
wearing a practical costume: what do you price it at, what do you do when someone
offers half, do you paint the thing that sells or the thing you meant, do you take the
commission for a portrait of somebody's dog, who do you show the unfinished one to,
what do you say when a stranger asks "but what is it?"

Good beats: the first sale, the piece you can't bring yourself to sell, an insulting
compliment, an unexpectedly generous stranger, someone asking for a discount because
"it's just paint."

## Arc 6 — The AI note-taking startup

A founder building yet another AI note-taking app, in a world visibly full of AI
note-taking apps. Optimistic, deeply earnest, and completely unbothered by the fact
that this is the fourth one launched this week.

The joke writes itself and it's tonally perfect for this quiz — a satire of personality
quizzes is already a satire of things that all look the same, and this arc is the tech
version of that. Keep the founder likable and genuinely excited; the humor comes from
sincerity aimed at something absurdly crowded, not from cynicism.

Fertile ground: naming the company (vowel removal, single lowercase words, "-ly"),
what the differentiator actually is, the demo that must not crash, pitching an investor
who's seen six of these today, a feature nobody asked for, the pivot, what the AI part
actually does, choosing a logo, the launch tweet, and the moment a competitor ships
your exact roadmap.

This arc can also poke at the app's own genre — a note-taking app that psychoanalyzes
your notes is a hop away from a personality quiz.

---

## Adding an arc

1. Decide where the arc sits in `flowOrder` (`src/lib/questions/index.js`) and keep
   its questions adjacent (unless it's a recurring-obstacle arc — see rules of thumb).
2. Write the first question with a `.premise` lead-in; later ones assume it.
3. If a later question depends on an earlier answer, add a small `$state` module in
   `src/lib/questions/` and handle the empty case (see `Q27Survivor.svelte`).
4. Add the arc to this file so other contributors extend it instead of duplicating it.

---

## Absurd reprises

A running gag: an early, perfectly normal question comes back much later with its
**prompt verbatim and its options subtly scrambled** — each answer is built from the
original's own phrase fragments in the wrong combinations. The taker half-recognizes
the question but can't place what's off, which is a much better joke than an obviously
silly option would be.

A one-position rotation of the fragments is the usual way to generate them (Q41 is a
clean example), but it's a starting point, not a constraint — Q42 crosses parts between
non-adjacent options and introduces one new noun. **The only real rule is that it has
to sound almost right.** Ship whichever permutation is funniest to read aloud.

Built so far, both as breathers between heavier interactive formats:

- **Q41PartyAgain** reprises **Q1Party** — the locations slide down a slot, so you can
  be "the center of the kitchen", chat "one-on-one in the corner", or pet "the host's
  dogs at home".
- **Q42DecisionAgain** reprises **Q2Decision** — verbs and objects recombine across
  each other, so you can "go with your pros-and-cons list", "make a list of everyone
  you know", or "delay your gut".
- **Q43RoughDayAgain** reprises **Q4RoughDay** — same object rotation. This one also
  *escalates*: the diary option is now an AI clone of your own voice reciting it back
  to you. Later reprises should keep doing that rather than only scrambling.

A caveat learned on Q43: **the rotation is a tool, not a rule.** Its last slot came out
mechanically as "call a close friend hard", which reads as broken English rather than
as a joke, so it was rewritten to "have an intense conversation with a close friend" —
unsettling in the right way while still being the same beat. If a slot lands as
nonsense instead of comedy, rewrite that slot and note it in the file header.

Conventions:

- **Keep the prompt identical to the original.** The prompt is the anchor that makes
  the option drift register as wrong.
- **Copy the original's scores by position**, so structurally it is the same question.
- **Say so in the file header**, with a before/after table. These read as typos to
  anyone who doesn't know the bit — every reprise file carries a DO NOT "fix" note, and
  new ones should too.
- Place them well away from the original so the callback is faint rather than obvious.

## Answer-driven presentation

Beyond arcs, an earlier answer can change *how* a later question is delivered rather
than what it asks. Two working examples:

- **Q16–Q19 → Q20.** Font, palette, button style and wallpaper choices are applied to
  Q20, so good taste renders a handsome question and silly taste renders a hideous one.
  State lives in `src/lib/design/choices.svelte.js`.
- **Q29 → every question until the next interlude.** `Q29Patience.svelte` asks "How
  patient are you?" (1–7) and writes the rating to `patienceState.svelte.js`. That
  rating then governs how *every following question is delivered*, until an interlude
  clears it. Two pieces:

  - **`PatienceLens.svelte`** (in `src/lib/`) wraps each question in the band. It
    cannot know what question it's wrapping — there's no shared text or option schema
    — so it works purely on the rendered box, which makes it apply to any question
    ever added. Impatient (1–2): the question is legible for 1.8s, then blurs out and
    stays blurred, still clickable. Patient (6–7): a downward mask wipe uncovers it
    over 14s, with `pointer-events: none` until it finishes, so it genuinely can't be
    answered early. Both offer the escape hatch, and taking it ends the bit for the
    whole band (`patience.bailed`).
  - **The band** is computed in `+page.svelte` from the flow — q29's index + 1 up to
    the next interlude — not from hardcoded positions, so it survives reshuffles of
    `flowOrder`. `patienceMode()` in the state module is the single source of truth
    for the delivery mode.

  **The band is bounded** by the "Thank you for your patience." interlude
  (`interludes.js`, pinned `after: 'q24'`), placed between displayed questions 29
  and 30, a handful of questions past q29
  in `flowOrder` — the message doubles as the punchline for anyone who just sat
  through the wipe. If q29 moves, keep that interlude's pin a few questions
  downstream of it, or the lens runs to the end of the quiz.

The general pattern: a `$state` module written by the earlier question, read by the
later one, always with a sane fallback for the unset case.

## Sequence-coupled questions

A weaker but stricter coupling: some questions depend on the taker having just *seen*
the previous one, without reading any state from it.

- **Q38 → Q39.** `Q38Picnic` asks which of four fridge items you'd take to a picnic,
  giving no hint that the list matters. `Q39Recall` then asks you to name those four
  from eight, where each of the four decoys is a near-miss of a real item (orange and
  lemon shadow the apple and banana, sports drink shadows the protein shake, meatball
  shadows the BLT). Correct recall reads as detail-orientation (`scope` negative);
  confidently picking items that were never there reads as gist-thinking and nerve
  (`scope` positive, `risk`) — the honesty consequences land in Q40.

  These two must stay **adjacent and in order** — Q39's prompt says "the previous
  question" — and Q39's four real labels must match Q38's options verbatim. Don't slip
  an interlude between them. Unlike the `$state` pairs above there's no fallback to
  write: a deep-link straight to Q39 just means the taker is guessing, which is
  acceptable for a debug tool.

- **Q39 → Q40.** `Q40Memory` then asks, on a plain five-point agree/disagree scale,
  whether you consider yourself to have a good memory. `Q39Recall` writes its verdict
  to `recallState.svelte.js` (`correct` is true only for a clean sweep — all four real
  items, nothing invented), and if you got it wrong the prompt gains one word: "Do you
  *actually* consider yourself to have a good memory?" Correct answers, and deep-links
  where `correct` is still `null`, get the straight-faced version, so the dig only
  lands on people who earned it.

  This is the general `$state` pattern rather than a pure sequence coupling, but it
  still wants to sit immediately after Q39 — the barb only reads while the failure is
  fresh.
