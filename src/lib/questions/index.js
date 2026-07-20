// The question registry and the play order, kept separate on purpose.
//
// Every question has a permanent, human-readable id — 'embezzler-flight',
// 'found-wallet' — which is also its ledger key. Ids describe the question,
// never its position, so `flowOrder` below reads as a running order rather
// than a list of numbers. Filenames keep their original QN prefix (they are
// just where the code lives); the registry is the only place the two meet.
// The displayed № comes from a question's position in `flowOrder`, so ids and
// display numbers drift apart as the quiz gets reshuffled; that's expected.
// New questions take a fresh descriptive slug; ids are never reused or
// renamed once referenced. Cross-question references (the ledger,
// interludes.js `after`) always use ids, never positions, so reordering is
// just editing `flowOrder`.
//
// Each component is fully self-contained and only shares the
// { onAnswer(delta) } contract with the orchestrator — so to add a question,
// build a new .svelte component any way you like, register it, and slot its
// id into `flowOrder`. No shared schema, no config engine.
import Q1Party from './Q1Party.svelte';
import Q2Decision from './Q2Decision.svelte';
import Q3Recharge from './Q3Recharge.svelte';
import Q7Coupon from './Q7Coupon.svelte';
import Q9OneMeal from './Q9OneMeal.svelte';
import Q11Fire from './Q11Fire.svelte';
import Q12Cheer from './Q12Cheer.svelte';
import Q14Argument from './Q14Argument.svelte';
import Q15Dinner from './Q15Dinner.svelte';
import Q16Font from './Q16Font.svelte';
import Q17Palette from './Q17Palette.svelte';
import Q18Button from './Q18Button.svelte';
import Q19Wallpaper from './Q19Wallpaper.svelte';
import Q20Artistic from './Q20Artistic.svelte';
import Q21Breakup from './Q21Breakup.svelte';
import Q22Illusion from './Q22Illusion.svelte';
import Q23Permission from './Q23Permission.svelte';
import Q25Alphabet from './Q25Alphabet.svelte';
import Q26MoveBox from './Q26MoveBox.svelte';
import Q27Airport from './Q27Airport.svelte';
import Q28Alignment from './Q28Alignment.svelte';
import Q29Patience from './Q29Patience.svelte';
import Q31Noise from './Q31Noise.svelte';
import Q32Balance from './Q32Balance.svelte';
import Q33Snakes from './Q33Snakes.svelte';
import Q34Ranking from './Q34Ranking.svelte';
import Q35Worth from './Q35Worth.svelte';
import Q36Lantern from './Q36Lantern.svelte';
import Q39Recall from './Q39Recall.svelte';
import Q40Memory from './Q40Memory.svelte';
import Q44HalfEmpty from './Q44HalfEmpty.svelte';
import Q46Equalizer from './Q46Equalizer.svelte';
import Q47Signs from './Q47Signs.svelte';
import Q48Honest from './Q48Honest.svelte';
import Q49Wallet from './Q49Wallet.svelte';
import Q50Planet from './Q50Planet.svelte';
import Q51Challenge from './Q51Challenge.svelte';
import Q52MathTest from './Q52MathTest.svelte';
import Q53Paintbrush from './Q53Paintbrush.svelte';
import Q54Delivery from './Q54Delivery.svelte';
import Q55Detail from './Q55Detail.svelte';
import Q56Terms from './Q56Terms.svelte';
import Q57Coffee from './Q57Coffee.svelte';
import Q58CoffeePrompt from './Q58CoffeePrompt.svelte';
import Q62MetricsAudit from './Q62MetricsAudit.svelte';
import Q63Birthdate from './Q63Birthdate.svelte';
import Q64FavouriteFood from './Q64FavouriteFood.svelte';
import Q65ChildhoodStreet from './Q65ChildhoodStreet.svelte';
import Q66MaidenName from './Q66MaidenName.svelte';
import Q60DecisionAudit from './Q60DecisionAudit.svelte';
import Q61ChatExit from './Q61ChatExit.svelte';

/** @type {Record<string, any>} */
const registry = {
	'party': Q1Party,
	'big-decision': Q2Decision,
	'recharge': Q3Recharge,
	'expired-coupon': Q7Coupon,
	'one-meal': Q9OneMeal,
	'embezzler-flight': Q11Fire,
	'comfort-friend': Q12Cheer,
	'argument-replay': Q14Argument,
	'perfect-dinner': Q15Dinner,
	'font-taste': Q16Font,
	'palette-taste': Q17Palette,
	'button-taste': Q18Button,
	'wallpaper-taste': Q19Wallpaper,
	'artistic-claim': Q20Artistic,
	'breakup-text': Q21Breakup,
	'circle-illusion': Q22Illusion,
	'location-permission': Q23Permission,
	'alphabet-subset': Q25Alphabet,
	'pack-box': Q26MoveBox,
	'airport-discard': Q27Airport,
	'planet-alignment': Q28Alignment,
	'patience-claim': Q29Patience,
	'rorschach': Q31Noise,
	'balance-scale': Q32Balance,
	'rotating-snakes': Q33Snakes,
	'rank-satisfying': Q34Ranking,
	'rank-value': Q35Worth,
	'lantern-price': Q36Lantern,
	'recall-trap': Q39Recall,
	'memory-claim': Q40Memory,
	'terms-consent': Q56Terms,
	'coffee-button': Q57Coffee,
	'coffee-prompt': Q58CoffeePrompt,
	'metrics-audit': Q62MetricsAudit,
	'birth-date': Q63Birthdate,
	'favourite-food': Q64FavouriteFood,
	'childhood-street': Q65ChildhoodStreet,
	'mothers-maiden-name': Q66MaidenName,
	'decision-audit': Q60DecisionAudit,
	'chat-exit': Q61ChatExit,
	'half-empty': Q44HalfEmpty,
	'equalizer': Q46Equalizer,
	'elevator-doors': Q47Signs,
	'honesty-claim': Q48Honest,
	'found-wallet': Q49Wallet,
	'asteroid-impact': Q50Planet,
	'easy-or-hard': Q51Challenge,
	'math-test': Q52MathTest,
	'hide-brush': Q53Paintbrush,
	'angry-customer': Q54Delivery,
	'detail-claim': Q55Detail
};

// Play order — the single editable manifest. Displayed № = position here.
// The stretches between interludes are CHAPTERS; interlude placement lives
// in src/lib/interludes.js, pinned to the ids below, so a chapter's bounds
// move with its questions.
// The order follows the absurdity curve (design.md): a normal chapter, then mild
// oddity and richer widgets, then mechanism gotchas and absurd content, then
// full joke, payoffs and the finale. Interlude placement lives in
// src/lib/interludes.js, pinned to these ids.
export const flowOrder = [
	// — Chapter 1: normal content, and a tour of every input type —
	// The job of this chapter is to teach the vocabulary: by its last question
	// the taker has met every way this quiz asks for an answer, while the
	// content stays plausible. Novelty escalates; the questions do not.
	'birth-date', // "what is your date of birth?" — DATE-ENTRY intro, and the
	//   astrology tell, asked deadpan. Nothing ever refers back to it, which is
	//   the point: the quiz collects what fortune-telling runs on and then
	//   reaches its verdict by other means.
	'party', // party ┐
	'big-decision', // decision │ pick-one cards
	'recharge', // recharge ┘
	'expired-coupon', // coupon
	'one-meal', // one meal
	'honesty-claim', // "are you honest?" — SLIDER intro; found-wallet tests it much later
	'detail-claim', // "attention to detail?" — a second claim, still untested
	'argument-replay', // replaying arguments — keep near the other sliders
	'comfort-friend', // comfort a friend — MULTI-SELECT intro
	'perfect-dinner', // build-your-meal — BUDGET-ALLOCATOR intro
	'rank-satisfying', // rank what's satisfying — DRAG-TO-RANK intro; rank-value weaponises it later
	// — Chapter 2: perception and taste — and one thing that does not belong —
	// This chapter is for questions with a VISUAL element: things you look at and
	// judge. Text-only questions belong in chapter 1 (ordinary) or 3+ (absurd) —
	// dinner-budget was cut from here for exactly that reason, see
	// docs/design.md § Removed questions.
	// Stashing the brush under the paper stains the stationery from here to the
	// END OF THE QUIZ — no interlude wipes it. Keep hide-brush ABOVE the design
	// block so the taker picks fonts and palettes with paint creeping out from
	// under the page.
	'rorschach', // "what do you see?" — Perlin-noise inkblot
	'circle-illusion', // "which circle is bigger?" — it lies
	'hide-brush', // the paintbrush — its paint stains the rest of the run
	'breakup-text', // a breakup by message, answered from the QuickType bar —
	//   sits here so the taker walks out of it straight into "pick a typeface"
	'font-taste', // font ┐
	'palette-taste', // palette │ design block — keep contiguous,
	'button-taste', // button │ immediately before their payoff
	'wallpaper-taste', // wallpaper ┘
	'artistic-claim', // "I have an artistic side" — restyled by the four above
	// — Chapter 3: mechanism gotchas & absurd content —
	'memory-claim', // "good memory?" — LIKERT intro, asked perfectly straight.
	//   Deliberately IMMEDIATELY before terms-consent: claim a good memory, then
	//   get handed 1,000 words with a clause buried in the middle of them.
	//   recall-trap in chapter 4 tests the claim, but only if it was "Strongly
	//   agree" — and its hard branch quotes this question's exact wording, so
	//   keep the two as far apart as the running order allows.
	'terms-consent', // the wall of legalese — a Likert row gated behind 7 screens
	//   of scroll, with a request for a dollar buried dead centre. Sits AHEAD of
	//   patience-claim deliberately: everything below that line is lensed, and
	//   stacking a 20× slow governor on top of a scroll gate is two endurance
	//   mechanics fighting for the same joke.
	'patience-claim', // "how patient are you?" — the lens governs the rest of this chapter
	'easy-or-hard', // easy life or hard life ┐ instant karma — keep adjacent, in this
	'math-test', //   the math test, sized to it ┘ order
	'coffee-button', // "buy me a coffee" — keep IMMEDIATELY before coffee-prompt,
	'coffee-prompt', //   which hands anyone who pledged a REAL Ko-fi button and
	//   asks whether they meant it. Placed late in the chapter so there are four
	//   questions between it and terms-consent, whose clause 5.4 asked the same
	//   thing in legalese.
	// — Chapter 4: denser gotchas, elaborate widgets, then the payoffs —
	'location-permission', // geolocation permission
	// The security-question run. Favourite food, childhood street, mother's
	// maiden name — the standard password-recovery set, asked one at a time in
	// the same voice as everything else. KEEP THESE THREE ADJACENT and in this
	// order; the escalation is the joke and it needs them in a row. Nothing any
	// of them collects is recorded anywhere (see TextAsk.svelte).
	'favourite-food',
	'childhood-street',
	'mothers-maiden-name',
	'embezzler-flight', // embezzler
	'equalizer', // audio EQ — an unusual input, so it sits well past chapter 2
	'balance-scale', // balance scale
	'rotating-snakes', // rotating snakes
	'half-empty', // glass half empty, in units
	'alphabet-subset', // alphabet subset
	// …and the payoff run, same chapter (no interlude splits these off):
	'recall-trap', // pays off memory-claim, back at the head of chapter 3
	'pack-box', // one box out of the flat — keep right before airport-discard,
	'airport-discard', //   whose options are exactly what you packed
	'chat-exit', // the group chat after the argument — reuses breakup-text's
	//   format from chapter 2, far enough away that the callback registers.
	//   Bonus-only cross-check against argument-replay, back in chapter 1.
	'rank-value', // rank lives by value — rank-satisfying's mechanic, weaponised
	'planet-alignment', // planetary alignment
	// The two audits, late on purpose: both read a record built across the whole
	// run, so the further down they sit the more there is to read. metrics-audit
	// SHOWS the telemetry; decision-audit hides its number and never admits it
	// checked.
	'metrics-audit', // the quiz shows you its own telemetry and asks if you accept it
	'decision-audit', // rate your own decisiveness — silently checked against it
	'found-wallet', // the wallet — pays off honesty-claim
	// — Finale —
	'elevator-doors', // elevator doors
	'lantern-price', // $4,800 lantern — a fluffy breather before the close
	'angry-customer', // berating customer — the delivery arc's live beat
	'asteroid-impact' // asteroid planet — the closer
];

if (import.meta.env.DEV) {
	const missing = flowOrder.filter((id) => !registry[id]);
	const unused = Object.keys(registry).filter((id) => !flowOrder.includes(id));
	const dupes = flowOrder.filter((id, i) => flowOrder.indexOf(id) !== i);
	if (missing.length || unused.length || dupes.length)
		throw new Error(
			`flowOrder out of sync with registry — missing: [${missing}], unused: [${unused}], duplicated: [${dupes}]`
		);
}

export const questions = flowOrder.map((id) => ({ id, component: registry[id] }));
