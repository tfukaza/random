// The question registry and the play order, kept separate on purpose.
//
// Every question has a permanent id: 'q' + the number in its filename, which
// is also its ledger key — 'q11' is the embezzler forever, wherever it plays.
// The displayed № comes from a question's position in `flowOrder`, so ids and
// display numbers drift apart as the quiz gets reshuffled; that's expected.
// New questions take fresh ids (q55, q56, …); ids are never reused or
// renumbered. Cross-question references (the ledger, interludes.js `after`)
// always use ids, never positions, so reordering is just editing `flowOrder`.
//
// Each component is fully self-contained and only shares the
// { onAnswer(delta) } contract with the orchestrator — so to add a question,
// build a new .svelte component any way you like, register it, and slot its
// id into `flowOrder`. No shared schema, no config engine.
import Q1Party from './Q1Party.svelte';
import Q2Decision from './Q2Decision.svelte';
import Q3Recharge from './Q3Recharge.svelte';
import Q4RoughDay from './Q4RoughDay.svelte';
import Q5Income from './Q5Income.svelte';
import Q6Dinner from './Q6Dinner.svelte';
import Q7Coupon from './Q7Coupon.svelte';
import Q8Product from './Q8Product.svelte';
import Q9OneMeal from './Q9OneMeal.svelte';
import Q10Floor from './Q10Floor.svelte';
import Q11Fire from './Q11Fire.svelte';
import Q12Cheer from './Q12Cheer.svelte';
import Q13Elderly from './Q13Elderly.svelte';
import Q14Argument from './Q14Argument.svelte';
import Q15Dinner from './Q15Dinner.svelte';
import Q16Font from './Q16Font.svelte';
import Q17Palette from './Q17Palette.svelte';
import Q18Button from './Q18Button.svelte';
import Q19Wallpaper from './Q19Wallpaper.svelte';
import Q20Artistic from './Q20Artistic.svelte';
import Q21GroupChat from './Q21GroupChat.svelte';
import Q22Illusion from './Q22Illusion.svelte';
import Q23Permission from './Q23Permission.svelte';
import Q24Residence from './Q24Residence.svelte';
import Q25Alphabet from './Q25Alphabet.svelte';
import Q26Backpack from './Q26Backpack.svelte';
import Q27Survivor from './Q27Survivor.svelte';
import Q28Alignment from './Q28Alignment.svelte';
import Q29Patience from './Q29Patience.svelte';
import Q31Noise from './Q31Noise.svelte';
import Q32Balance from './Q32Balance.svelte';
import Q33Snakes from './Q33Snakes.svelte';
import Q34Ranking from './Q34Ranking.svelte';
import Q35Worth from './Q35Worth.svelte';
import Q36Lantern from './Q36Lantern.svelte';
import Q37City from './Q37City.svelte';
import Q38Picnic from './Q38Picnic.svelte';
import Q39Recall from './Q39Recall.svelte';
import Q40Memory from './Q40Memory.svelte';
import Q41PartyAgain from './Q41PartyAgain.svelte';
import Q42DecisionAgain from './Q42DecisionAgain.svelte';
import Q43RoughDayAgain from './Q43RoughDayAgain.svelte';
import Q44HalfEmpty from './Q44HalfEmpty.svelte';
import Q45Flooded from './Q45Flooded.svelte';
import Q46Equalizer from './Q46Equalizer.svelte';
import Q47Signs from './Q47Signs.svelte';
import Q48Honest from './Q48Honest.svelte';
import Q49Wallet from './Q49Wallet.svelte';
import Q50Planet from './Q50Planet.svelte';
import Q51Challenge from './Q51Challenge.svelte';
import Q52MathTest from './Q52MathTest.svelte';
import Q53Weapon from './Q53Weapon.svelte';
import Q54Delivery from './Q54Delivery.svelte';

/** @type {Record<string, any>} */
const registry = {
	q1: Q1Party,
	q2: Q2Decision,
	q3: Q3Recharge,
	q4: Q4RoughDay,
	q5: Q5Income,
	q6: Q6Dinner,
	q7: Q7Coupon,
	q8: Q8Product,
	q9: Q9OneMeal,
	q10: Q10Floor,
	q11: Q11Fire,
	q12: Q12Cheer,
	q13: Q13Elderly,
	q14: Q14Argument,
	q15: Q15Dinner,
	q16: Q16Font,
	q17: Q17Palette,
	q18: Q18Button,
	q19: Q19Wallpaper,
	q20: Q20Artistic,
	q21: Q21GroupChat,
	q22: Q22Illusion,
	q23: Q23Permission,
	q24: Q24Residence,
	q25: Q25Alphabet,
	q26: Q26Backpack,
	q27: Q27Survivor,
	q28: Q28Alignment,
	q29: Q29Patience,
	q31: Q31Noise,
	q32: Q32Balance,
	q33: Q33Snakes,
	q34: Q34Ranking,
	q35: Q35Worth,
	q36: Q36Lantern,
	q37: Q37City,
	q38: Q38Picnic,
	q39: Q39Recall,
	q40: Q40Memory,
	q41: Q41PartyAgain,
	q42: Q42DecisionAgain,
	q43: Q43RoughDayAgain,
	q44: Q44HalfEmpty,
	q45: Q45Flooded,
	q46: Q46Equalizer,
	q47: Q47Signs,
	q48: Q48Honest,
	q49: Q49Wallet,
	q50: Q50Planet,
	q51: Q51Challenge,
	q52: Q52MathTest,
	q53: Q53Weapon,
	q54: Q54Delivery
};

// Play order — the single editable manifest. Displayed № = position here.
// The order follows the absurdity curve (design.md): a normal band, then mild
// oddity and richer widgets, then mechanism gotchas and absurd content, then
// full joke, payoffs and the finale. Interlude placement lives in
// src/lib/interludes.js, pinned to these ids.
export const flowOrder = [
	// — Band A: normal content, simple inputs —
	'q1', // party (reprise anchor for q41)
	'q2', // decision (reprise anchor for q42)
	'q3', // recharge
	'q4', // rough day (reprise anchor for q43)
	'q37', // ideal city — the normal version; q24 is its absurd echo much later
	'q7', // coupon
	'q9', // one meal
	'q8', // meet-and-greet line
	'q48', // "are you honest?" — build-up; the wallet (q49) tests it ~40 later
	'q13', // delivery / elderly man — slider intro
	'q14', // argument replay — keep right after q13, it reuses that slider
	'q12', // comfort a friend — multi-select intro
	// — Band B: mild oddity, richer widgets —
	'q34', // tame drag-to-rank — teaches the mechanic q35 weaponises much later
	'q5', // ideal income
	'q6', // dinner budget
	'q15', // build-your-meal budget widget
	'q10', // 100-story floor pick
	'q46', // audio EQ
	'q16', // font ┐
	'q17', // palette │ design block — keep q16–q19 contiguous,
	'q18', // button │ immediately before their payoff q20
	'q19', // wallpaper ┘
	'q20', // "I have an artistic side" — restyled by q16–q19; keep right after
	'q21', // scam group chat
	// — Band C: mechanism gotchas & absurd content —
	'q29', // "how patient are you?" — the lens governs the rest of this band
	'q51', // easy life or hard life ┐ instant karma — keep adjacent, in this
	'q52', //   the math test, sized to it ┘ order
	'q22', // circle illusion
	'q24', // uninhabitable residence — absurd echo of q37
	// — Band D: denser mechanism gotchas —
	'q23', // geolocation permission
	'q31', // Perlin-noise Rorschach
	'q11', // embezzler
	'q32', // balance scale
	'q33', // rotating snakes
	'q44', // glass half empty, in units
	'q25', // alphabet subset
	// — Band E: full joke, payoffs, reprises —
	'q38', // fridge pick ┐ memory run — keep adjacent, in this order,
	'q39', // recall trap │ with no interlude between them
	'q40', // "good memory?" ┘
	'q41', // party, again (scrambled reprise of q1 — keep far from it)
	'q42', // decision, again (reprise of q2)
	'q43', // rough day, again (reprise of q4)
	'q26', // zombie backpack — keep right before q27,
	'q27', //   whose options are what you packed
	'q35', // rank lives by value — q34's mechanic, weaponised
	'q28', // planetary alignment
	'q45', // flooded building
	'q49', // the wallet — pays off q48
	// — Finale —
	'q47', // elevator doors
	'q36', // $4,800 lantern — fluffy breather right before the hardball (P5)
	'q53', // the weapon — the seep runs from here until the final interlude
	'q54', // berating customer — first screen the bleeding carries onto
	'q50' // asteroid planet — the closer
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
