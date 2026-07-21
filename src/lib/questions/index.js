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
import Q29Patience from './Q29Patience.svelte';
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
import Q69PointerHeatmap from './Q69PointerHeatmap.svelte';
import Q63Birthdate from './Q63Birthdate.svelte';
import Q64FavouriteFood from './Q64FavouriteFood.svelte';
import Q65ChildhoodStreet from './Q65ChildhoodStreet.svelte';
import Q66MaidenName from './Q66MaidenName.svelte';
import Q67Scene from './Q67Scene.svelte';
import Q68SceneRecall from './Q68SceneRecall.svelte';
import Q60DecisionAudit from './Q60DecisionAudit.svelte';
import Q70DarkMode from './Q70DarkMode.svelte';

/** @type {Record<string, any>} */
const registry = {
	'party': Q1Party,
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
	'patience-claim': Q29Patience,
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
	'pointer-heatmap': Q69PointerHeatmap,
	'birth-date': Q63Birthdate,
	'favourite-food': Q64FavouriteFood,
	'childhood-street': Q65ChildhoodStreet,
	'mothers-maiden-name': Q66MaidenName,
	'scene-watch': Q67Scene,
	'scene-recall': Q68SceneRecall,
	'decision-audit': Q60DecisionAudit,
	'light-or-dark': Q70DarkMode,
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
	'recharge', // recharge ┘
	'expired-coupon', // coupon
	'one-meal', // one meal
	'honesty-claim', // "are you honest?" — SLIDER intro; found-wallet tests it much later
	'detail-claim', // "attention to detail?" — a second claim, still untested
	'argument-replay', // replaying arguments — keep near the other sliders
	'comfort-friend', // comfort a friend — MULTI-SELECT intro
	'perfect-dinner', // build-your-meal — BUDGET-ALLOCATOR intro
	'alphabet-subset', // dual-range subset selector
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
	'memory-claim', // "good memory?" — LIKERT intro, asked perfectly straight.
	//   FIRST in the chapter and recall-trap is LAST, which is the widest gap the
	//   two can have now that both live here. The hard branch quotes this
	//   question's exact wording back at the taker, so every question in between
	//   is working for it — never let them drift closer together.
	'terms-consent', // the wall of legalese — a Likert row gated behind 7 screens
	//   of scroll, with a request for a dollar buried dead centre. Sits
	//   IMMEDIATELY after memory-claim on purpose: it reuses the exact same Likert
	//   row the taker just answered, so a four-thousand-word contract arrives
	//   wearing the costume of the innocent survey item before it — that reuse IS
	//   the joke. Text-heavy in a visual chapter, but adjacency to memory-claim
	//   wins over the chapter guideline.
	'circle-illusion', // "which circle is bigger?" — it lies
	'hide-brush', // the paintbrush — its paint stains the rest of the run
	'angry-customer', // berating customer — the delivery arc's live beat. Sits
	//   IMMEDIATELY after hide-brush on purpose: it is the first screen the
	//   spreading paint actually carries onto (Q54's header says so — this
	//   placement is what makes that true). Text-only in the visual chapter,
	//   but the paint underneath it is doing the visual work.
	'breakup-text', // a breakup by message, answered from the QuickType bar —
	//   sits here so the taker walks out of it straight into "pick a typeface"
	'font-taste', // font ┐
	'palette-taste', // palette │ design block — keep contiguous,
	'button-taste', // button │ immediately before their payoff
	'wallpaper-taste', // wallpaper ┘
	'artistic-claim', // "I have an artistic side" — restyled by the four above
	'recall-trap', // pays off memory-claim at the head of this chapter. MUST stay
	//   after it — recall-trap reads the claim, and running first would leave it
	//   null, silently serving the gentle branch forever with nothing to show a
	//   bug had happened.
	// — Chapter 3: mechanism gotchas & absurd content —
	'patience-claim', // "how patient are you?" — the lens governs the rest of this chapter
	'easy-or-hard', // easy life or hard life ┐ instant karma — keep adjacent, in this
	'math-test', //   the math test, sized to it ┘ order
	'coffee-button', // "buy me a coffee" — keep IMMEDIATELY before coffee-prompt,
	'coffee-prompt', //   which hands anyone who pledged a REAL Ko-fi button, or
	//   asks non-pledgers what could change their mind,
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
	'scene-watch', // a street corner, animated, watched on a fixed window. Asks an
	//   ordinary aesthetic question; the real point is the NEXT one. Must stay
	//   immediately before scene-recall, and must stay OUT of the patience band
	//   (patience-claim → the coffee-prompt interlude) — a memory test delivered
	//   at ×0.05 or speed-read is not the same test.
	'scene-recall', // bills the scene, branching on the memory type named back in
	//   recall-trap. Correctness is derived in sceneModel.js from the same grid
	//   the scene is drawn on, so the art and the answer key cannot drift.
	'equalizer', // audio EQ — an unusual input, so it sits well past chapter 2
	'half-empty', // glass half empty, in units
	// …and the payoff run, same chapter (no interlude splits these off):
	'pack-box', // one box out of the flat — keep right before airport-discard,
	'airport-discard', //   whose options are exactly what you packed
	'balance-scale', // "what's of equal worth?" — placed just after the packing
	//   beat: you decide what to keep, throw one away, then weigh worth in the
	//   abstract. Clusters with rank-value, the other value question. (Cannot sit
	//   BETWEEN pack-box and airport-discard — that pair must stay adjacent.)
	'rank-value', // rank lives by value — rank-satisfying's mechanic, weaponised
	// The pointer picture freezes a trail built across the run, then asks whether
	// the taker recognizes their own inputs. Keep it late so the field is dense.
	'pointer-heatmap',
	'decision-audit', // rate your own decisiveness — silently checked against it
	'light-or-dark', // "light mode or dark mode?" — answer dark and, ON SUBMIT,
	//   the room goes dark and a table lamp sputters on (LampOverlay), for the
	//   rest of the run. Enacted, never mentioned, per P6. Post-answer JS
	//   animation, so the PatienceLens rule is untouched; keep it out of the
	//   patience band regardless. Difficulty (easy-or-hard 6/7) dims the bulb
	//   and schedules blackouts; patience ≥6 lengthens them; a Ko-fi pledge
	//   keeps the lights on. See lampState / LampOverlay.
	'found-wallet', // the wallet — pays off honesty-claim
	// — Finale —
	'elevator-doors', // elevator doors
	'lantern-price', // $4,800 lantern — a fluffy breather before the close
	'rotating-snakes', // the second illusion, saved for the end: "are the circles
	//   rotating?" as the penultimate note. detail-claim (chapter 1) still cross-
	//   checks it, same as circle-illusion.
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
