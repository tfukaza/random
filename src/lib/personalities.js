// The 128 personalities: every combination of the seven axes' poles.
//
// Type code: one letter per axis, in AXES order —
//   social E/I · honesty H/D · creative C/P · risk B/W · scope G/F ·
//   tempo Q/S · coord T/L
// (E xtrovert/I ntrovert, H onest/D ishonest, C reative/P ragmatic,
//  B old/W ary, G rand/F ine, Q uick/S teady, T eam/L one.)
// No letter pair repeats, so a code like EHCBGQT is unambiguous.
//
// Titles are compositional — the affix grammar is part of the parody:
//   The [Self-Described]? [Sudden|Patient] [Gregarious|Quiet] <Noun>
// with the noun determined by the four operating axes (creative, risk,
// scope, coord) and "Self-Described" reserved for the dishonest.
//
// NOTE: `titleOf` is no longer rendered anywhere — the result card shows a
// plant instead (see plantFor below). It is kept because NOUNS still
// documents how the 128 blurbs below are grouped, and because a title is the
// obvious thing to want for share text later. Not dead by accident.
//
// Blurbs are individually written, all 128, grouped by noun (8 per group:
// honesty × tempo × social). House rules (docs/design.md): second person,
// certificate register, 30–60 words, every pole reflected, dishonest (D)
// blurbs undermine the taker, no two blurbs in a group open alike.

import { AXES } from '$lib/scoring.js';
import { PLANTS } from '$lib/plants.js';

/** Positive/negative letter per axis, in AXES order. */
const LETTERS = [
	['E', 'I'],
	['H', 'D'],
	['C', 'P'],
	['B', 'W'],
	['G', 'F'],
	['Q', 'S'],
	['T', 'L']
];

/**
 * The 16 archetype nouns, keyed by the operating letters [C/P][B/W][G/F][T/L].
 * @type {Record<string, string>}
 */
export const NOUNS = {
	CBGT: 'Impresario',
	CBGL: 'Visionary',
	CBFT: 'Showrunner',
	CBFL: 'Inventor',
	PBGT: 'Commander',
	PBGL: 'Gambler',
	PBFT: 'Operator',
	PBFL: 'Daredevil',
	CWGT: 'Curator',
	CWGL: 'Dreamer',
	CWFT: 'Artisan',
	CWFL: 'Miniaturist',
	PWGT: 'Steward',
	PWGL: 'Strategist',
	PWFT: 'Quartermaster',
	PWFL: 'Archivist'
};

/** @param {string} code 7-letter type code */
export function titleOf(code) {
	const noun = NOUNS[code[2] + code[3] + code[4] + code[6]];
	const prefix = code[1] === 'D' ? 'Self-Described ' : '';
	const tempoAdj = code[5] === 'Q' ? 'Sudden' : 'Patient';
	const socialAdj = code[0] === 'E' ? 'Gregarious' : 'Quiet';
	return `The ${prefix}${tempoAdj} ${socialAdj} ${noun}`;
}

/**
 * Read the type code as seven bits (positive pole 0, negative 1) → 0…127,
 * and use that to index PLANTS. The mapping is therefore a bijection, stable
 * for a given code, and completely arbitrary — the ORDER of the plants list
 * *is* the mapping, so reshuffling that list re-rolls every assignment.
 *
 * The taker is told they are a Hydnora africana and offered no explanation,
 * because there isn't one.
 * @param {string} code
 */
export function plantFor(code) {
	let index = 0;
	for (let i = 0; i < LETTERS.length; i++) {
		index = (index << 1) | (code[i] === LETTERS[i][0] ? 0 : 1);
	}
	return PLANTS[index % PLANTS.length];
}

/**
 * Collapse a score map to its 7-letter type. `value ≥ 0` → positive pole
 * (for honesty: innocent until proven lying).
 * @param {Record<string, number>} scores
 */
export function typeOf(scores) {
	const code = AXES.map((a, i) => ((scores[a.id] ?? 0) >= 0 ? LETTERS[i][0] : LETTERS[i][1])).join(
		''
	);
	return { code, title: titleOf(code), blurb: PERSONALITIES[code], plant: plantFor(code) };
}

/**
 * All 128 blurbs, keyed by type code.
 * @type {Record<string, string>}
 */
export const PERSONALITIES = {
	// ── The Impresario (creative · bold · grand · team) ──────────────────
	EHCBGQT:
		'You announce the grand plan before breakfast and by dinner strangers are wearing costumes. The vision is real, the budget is imaginary, and people follow you anyway, mostly to see what happens. This document certifies that what happens is usually worth it.',
	EHCBGST:
		'You build spectacles the slow way: a decade-long festival, a cathedral of a group project. Everyone you have ever met is somehow involved, and none of them can say no to you. The instrument notes, with respect, that you never once rushed.',
	EDCBGQT:
		'You claim the circus was your idea. Witnesses recall you arriving after the tent was up, loudly. Still, the crowd loves you, the plans are enormous, and the room moves when you enter it. We print this account under mild protest.',
	EDCBGST:
		'By your telling, every great collective triumph in your vicinity traces back to you, patiently orchestrated over years. Our records show at least one of them does. You are magnificent company, endlessly ambitious, and not to be left alone with the ledger.',
	IHCBGQT:
		'You dislike crowds and assemble them anyway, because the vision needs forty hands and needs them now. You direct from the wings, decisively, then go home without attending your own premiere. The work is dazzling. You were never seen.',
	IHCBGST:
		'From a quiet room you run an enormous, patient, many-handed dream — memos instead of speeches, years instead of seasons. The people building it have never met you and would follow you anywhere. You will not attend the unveiling, and it will be magnificent.',
	IDCBGQT:
		'You describe yourself as the reclusive genius behind sudden collective marvels. The collective describes a person who appeared, rearranged everything, and vanished before questions. Both accounts agree it worked. Only one of them mentions whose idea it originally was.',
	IDCBGST:
		'Your account: a quiet mastermind, patiently guiding vast joint ventures from the shadows. The shadows, when interviewed, were surprised to hear it. Nevertheless the ventures thrive, the plans are genuinely grand, and nobody can prove it was not you.',

	// ── The Visionary (creative · bold · grand · lone) ───────────────────
	EHCBGQL:
		'You explain the future to anyone who will stand still, then go build it entirely alone, starting tonight. Collaborators slow you down; audiences do not. The future you describe is implausible, arriving anyway, and — the instrument confirms — honestly reported.',
	EHCBGSL:
		'You are delightful at parties and monastic at work: decades on one impossible thing, no assistants, no shortcuts. People adore you and understand nothing about your project, which is how you like it. This office believes you when you say it is almost ready.',
	EDCBGQL:
		'You announce a new masterwork weekly, dated yesterday. None have shipped. The charm is real, the leaps are real; the finish line, per our observations, is decorative. Print it anyway, you said. We did.',
	EDCBGSL:
		'By your account you have been patiently, single-handedly building the future for years, and it would be rude to ask where. Charismatic, sweeping, unverifiable. The instrument found no evidence — which, you correctly point out, is exactly what a visionary’s file should look like.',
	IHCBGQL:
		'You see the whole board at once, decide in seconds, and tell no one. Years later something impossible appears with no name on it. That was you. This certificate is the closest thing to credit you will ever accept.',
	IHCBGSL:
		'Alone, unhurried, honest to a fault, you are assembling something too large to explain and too slow to headline. You have told exactly one person, accurately. When it lands, everyone will claim they believed in you. You will not correct them.',
	IDCBGQL:
		'You call yourself an undiscovered genius, and discovery does keep failing to occur. The sketches are genuinely audacious; the dates on them have been adjusted. Alone by choice, sudden by temperament, truthful by exception. The instrument admires the nerve.',
	IDCBGSL:
		'Your story is the long game: a solitary, decades-deep vision no one is ready to see. Our notes say you started last month. Grand, patient, private, and lightly fictional — the file is sealed, as you requested, from fact-checkers.',

	// ── The Showrunner (creative · bold · fine · team) ───────────────────
	EHCBFQT:
		'You run the room, the rundown, and the seating chart, all at volume, all at once. Creative enough to invent the show, precise enough to time it to the second, brave enough to go live. The credits are long because you shared them.',
	EHCBFST:
		'Season after season you gather the same strange, devoted crew and polish every frame together. Nothing ships until it is right; no one burns out on your watch. Sociable, meticulous, quietly fearless. The instrument found zero discrepancies and one waiting list.',
	EDCBFQT:
		'The production is flawless and everyone knows their cue — you made sure, loudly, at speed. You also, per our notes, take credit for two departments you have never visited. The show is too good for anyone to press the point.',
	EDCBFST:
		'You patiently built an ensemble, a system, a machine of a show — and a version of events in which nothing was ever your fault. The craft is impeccable. The accounting is creative. We enjoyed both.',
	IHCBFQT:
		'You would rather not be on stage, which is why every stage you run works. Split-second calls, immaculate details, a crew that trusts you completely, a wrap party you skip. Honest with notes, invisible in credits, irreplaceable in fact.',
	IHCBFST:
		'Quiet, exact, endlessly patient, you turn a roomful of temperaments into one clean take at a time. You give notes privately and praise precisely. Nobody has ever heard you raise your voice, and nobody has ever missed your meaning.',
	IDCBFQT:
		'You claim you barely did anything. The fourteen annotated binders suggest otherwise, as does the crew that cannot function without you. False modesty is still a falsehood; the instrument has scored it accordingly. The show, however, is perfect.',
	IDCBFST:
		'Your version: a humble backstage helper, patiently supporting the team. The team’s version: you run everything, control everything, and have never once admitted it. Precision like yours does not happen by accident. Neither do reputations.',

	// ── The Inventor (creative · bold · fine · lone) ─────────────────────
	EHCBFQL:
		'You talk through the idea at full speed to whoever is nearest, then vanish into the workshop and emerge with the thing itself, working, before anyone finished objecting. Every joint is tight; every claim checks out. Ship first, apologize never.',
	EHCBFSL:
		'You are excellent company who disappears for months, returning with something small, precise, astonishing, done. No team, no shortcuts, no exaggeration — the tolerances are honest and so are you. People have stopped asking what you are working on. They wait.',
	EDCBFQL:
		'The prototype is brilliant and the demo is rigged — only slightly, you would argue, and only until Tuesday. Fast hands, fine tolerances, flexible facts. The instrument notes that everything you fake eventually gets built anyway, which is its own strange integrity.',
	EDCBFSL:
		'Charming abroad, secretive at the bench, you have spent years perfecting a device you describe differently to everyone. Somewhere among the versions is a true one. Your craftsmanship is beyond dispute; your patch notes are literature.',
	IHCBFQL:
		'Alone at two in the morning, you solve it, build it, test it, and file it, in that order, before deciding whether to tell anyone. Usually you do not. The work is quick, exact, and exactly as described. You are your own peer review.',
	IHCBFSL:
		'One workbench, one decade, one impossible mechanism, no witnesses. You measure twice and cut once because waste offends you. When asked how it works you explain accurately and at length, which is why no one asks twice.',
	IDCBFQL:
		'You invent brilliantly and narrate loosely: dates shift, prior art evaporates, the eureka story improves annually. Alone, swift, exacting — and, per our file, the true origin of at least one thing a corporation now claims. Fair is fair.',
	IDCBFSL:
		'Your notebooks are immaculate and backdated. The invention is real, the patience is real, the paper trail is a novella. You work alone, so there are no witnesses either way. This certificate takes no position on the lawsuit.',

	// ── The Commander (pragmatic · bold · grand · team) ──────────────────
	EHPBGQT:
		'You size the hill, call the charge, and everyone somehow already has their orders. No poetry, no hesitation, no spin: the plan is big, the briefing is short, and the after-action report matches what happened. People follow you because it works.',
	EHPBGST:
		'You move large groups toward large goals at a pace that never breaks anyone. Logistics before glory, truth before comfort, always. Your campaigns take years and arrive on schedule. The instrument salutes.',
	EDPBGQT:
		'The operation succeeded; your retelling of it is a different, better operation. Decisive, commanding, adored by the troops — and unencumbered by the record. History is written by winners, you note. History, here, is footnoted.',
	EDPBGST:
		'You built the coalition patiently, brick by brick, favor by favor — and remember every favor differently than its owner does. Grand plans, firm hand, negotiable memory. Nothing you run fails; nothing you report audits cleanly.',
	IHPBGQT:
		'You dislike podiums and win anyway: sharp calls, big maps, small words. Your people get clear orders, honest reasons, and full credit, in that order. Then you leave before the toast. Command, it turns out, does not require attendance.',
	IHPBGST:
		'From a back office you patiently move the whole organization somewhere better, one honest memo at a time. Every promise kept, every timeline met, no speeches given. People realize you were in charge only after it worked.',
	IDPBGQT:
		'You issue orders like weather: sudden, total, unarguable. Results follow; explanations do not. What you tell the team and what you knew diverge just often enough that we checked twice. The victories, at least, are real.',
	IDPBGST:
		'The long campaign succeeded exactly as you planned, according to the plan you revised after it succeeded. Steady hands, quiet rooms, careful edits. Your people trust you completely, which the instrument finds both touching and premature.',

	// ── The Gambler (pragmatic · bold · grand · lone) ────────────────────
	EHPBGQL:
		'You tell the table exactly what you are about to do, then do it, alone, for stakes that make bystanders sit down. No system, no partners, no bluff — that is the trick: you never lie, and nobody believes you. The math, somehow, holds.',
	EHPBGSL:
		'You place one enormous bet a decade and spend the years between cheerfully explaining it to skeptics. No syndicate, no hedge, no exaggeration. Three have paid out so far. You are either very lucky or very early, and honest about which.',
	EDPBGQL:
		'Fast, huge, solo, and narrated afterward with significant improvements. Your wins are real; your losses are lessons that appear in no ledger. The instrument tried to audit you and received, instead, an anecdote. It was, admittedly, a great anecdote.',
	EDPBGSL:
		'For years you have cultivated the legend of the one big score, patiently, at every dinner party. The score itself remains scheduled. Bold in scale, careful in execution, loose in fact — you are the only person who knows your actual balance.',
	IHPBGQL:
		'You decide alone, instantly, at scale, and tell no one until the wire clears. Then you tell them everything, accurately, including the part where you almost lost it all. No showmanship. Just nerve, arithmetic, and a clean record.',
	IHPBGSL:
		'Quietly, over years, you position one colossal wager no one knows about. You would tell them honestly if they asked; nobody thinks to ask. When it lands, it will look like luck. Your notes, dated and true, will say otherwise.',
	IDPBGQL:
		'You move fast, alone, all-in — and keep two sets of stories the way others keep two sets of books. Even the instrument cannot find the real number. We suspect you cannot either, anymore. The bets keep landing regardless.',
	IDPBGSL:
		'Patient, private, and prone to rounding up: your fortune, your risks, and your comebacks are each roughly forty percent narrative. The remaining sixty is genuinely impressive, which is why the narrative works. Please gamble responsibly, or at least consistently.',

	// ── The Operator (pragmatic · bold · fine · team) ────────────────────
	EHPBFQT:
		'Six people, ninety seconds, no mistakes: your favorite kind of plan. You brief the crew straight — risks included — then run it exactly as briefed. Charming under pressure, exact under fire, honest afterward even when it costs you.',
	EHPBFST:
		'You rehearse the team until the daring part looks boring, which is the point. Every contingency numbered, every member accounted for, every debrief truthful. The jobs are audacious; the execution is bookkeeping. Nobody gets left behind, ever.',
	EDPBFQT:
		'The crew executes your plan flawlessly; the client hears a version with more danger and fewer helpers. Swift, precise, magnetic — the instrument confirms the skills and disputes the invoice. Everyone still signs up for the next one.',
	EDPBFST:
		'Methodical, sociable, detail-perfect — and running, per our audit, at least one operation nobody else on the team knows about. The visible work is excellent. The invisible work is presumably also excellent. We were not invited.',
	IHPBFQT:
		'You speak rarely, plan tightly, and strike fast with a small crew that would follow you into a locked vault — has, in fact. Every risk disclosed, every cut fair. The quiet one runs it. Everyone knows. Nobody says.',
	IHPBFST:
		'Your operations unfold like slow machinery: each person placed, each detail tested, each promise kept. You never raise your voice; the plan speaks. When it is over you divide the credit precisely and keep only the smallest share.',
	IDPBFQT:
		'The team trusts your rapid, exact orders completely — which is efficient, since the full plan exists only in your head, edited. Bold work, fine work, selective truth. The instrument recommends your colleagues count their shares. Twice.',
	IDPBFST:
		'Patient, precise, indispensable to the crew — and quietly maintaining a second ledger for clarity. Clarity, in our review, flows one direction. Still: no job has failed, no partner provably shorted, no question fully answered. Professionally, we are impressed.',

	// ── The Daredevil (pragmatic · bold · fine · lone) ───────────────────
	EHPBFQL:
		'You check the rope yourself, twice, announce exactly what you are attempting, and jump before the crowd finishes gasping. No spotter, no myth: the danger is measured, the measurements are yours, and the story afterward matches the footage.',
	EHPBFSL:
		'You spend months preparing alone for eleven seconds of risk, and you will tell anyone precisely how unglamorous that is. Every bolt torqued, every variable logged. The stunt looks insane; the binder says otherwise. Both are accurate.',
	EDPBFQL:
		'The leap was real; the claim of no safety net was, per our telephoto lens, aspirational. Fast, solo, technically immaculate — you cheat only the narrative, never the physics. The audience prefers your version. Physics files no complaints.',
	EDPBFSL:
		'You rehearse in secret for years, then present each feat as improvised. It is tidier that way, you say. Meticulous, wary of witnesses, casual with chronology. The record books have questions; the footage has none.',
	IHPBFQL:
		'No audience, no announcement, no margin for error — just you, a checklist, and a cliff, on a Tuesday. You log the attempt honestly, including the bad ones, and show the log to no one. It was never about them.',
	IHPBFSL:
		'Alone, unhurried, you take exactly one enormous risk at a time, prepared to the millimeter. You have never told anyone the full list. It is longer than anyone would guess, and every entry on it is true.',
	IDPBFQL:
		'You free-solo through life at speed and describe it afterward as no big deal, which our heart-rate data disputes. Understatement is still misstatement. Alone, exact, fearless, and allergic to accurate credit — even when it is owed to you.',
	IDPBFSL:
		'Your feats are patient, private, flawlessly engineered, and — when finally mentioned — curiously relocated in time and scale. The instrument suspects even your modesty is a performance with a safety margin. The danger, however, was always real.',

	// ── The Curator (creative · wary · grand · team) ─────────────────────
	EHCWGQT:
		'You gather people around beauty the way others gather them around fires — quickly, warmly, and with surprising authority about where everything goes. Big taste, careful hands, honest labels. Nothing in your collection is borrowed without a card that says so.',
	EHCWGST:
		'Over years you have assembled rooms, circles, and archives that make strangers feel curated into something larger. Prudent with risk, lavish with vision, scrupulous with attribution. People leave your gatherings better arranged than they arrived.',
	EDCWGQT:
		'Your salons are legendary and swiftly assembled; the provenance of several centerpieces is, per our records, aspirational. Grand vision, careful execution, decorative sourcing. Everyone knows. The rooms are too beautiful for anyone to mind.',
	EDCWGST:
		'Patiently, tastefully, you have built a gallery of a life — and captioned it loosely. Dates soften, credits drift toward you, the collection grows. The instrument suggests footnotes. You suggest better lighting. The visitors side with you.',
	IHCWGQT:
		'You assemble sweeping, careful, collective things — anthologies, gardens, movements — while avoiding your own openings. Decisions come fast; credit is distributed accurately and elsewhere. The whole is always grander than anyone expected from someone so quiet.',
	IHCWGST:
		'Slowly, honestly, at one remove, you arrange people and works into constellations they could not see from inside. You are cited in everyone’s acknowledgments and no one’s headlines, exactly as you prefer. The instrument confirms: it was you, every time.',
	IDCWGQT:
		'You claim to just tidy things up a little. The movement you allegedly did not found begs to differ. Quick eyes, careful hands, vast designs, vanishing fingerprints. Our file on you is mostly other people’s work you arranged. Noted.',
	IDCWGST:
		'Your account of the collection omits, on average, one benefactor per wing. Patient, discerning, communal in method and proprietary in memory. It is a masterpiece of arrangement — including, the instrument observes, the arrangement of the facts.',

	// ── The Dreamer (creative · wary · grand · lone) ─────────────────────
	EHCWGQL:
		'You narrate enormous futures over coffee with total strangers, sketch them on napkins, and take none of the risks — honestly none; you checked. Quick to imagine, slow to leap, accurate about which is which. The napkins are becoming valuable.',
	EHCWGSL:
		'Your inner world has provinces. You visit them alone, carefully, on a schedule, and report back truthfully when asked, which is rarely. Nothing is risked; everything is imagined; the imagining is the point. The instrument found it all in order.',
	EDCWGQL:
		'The visions arrive fast and leave, in your retelling, several sizes larger. Cautious in deed, extravagant in claim, solitary in both. Somewhere between the story and the sketchbook is a genuinely remarkable mind. We have marked the discrepancies in pencil.',
	EDCWGSL:
		'For decades you have been on the verge of the great work, a verge you maintain beautifully and alone. The dream is real; the timeline is upholstery. The instrument notes that even your procrastination has a certain grandeur.',
	IHCWGQL:
		'Ideas strike you like weather and you shelter honestly: noting each one, chasing none, promising nothing. Alone with a vast interior and precise about its borders. What you could build is enormous. What you will build, you say plainly, is peace.',
	IHCWGSL:
		'Quiet, careful, truthful, immense on the inside: you tend a lifelong imaginary country with real discipline and no ambassadors. You have never claimed it was more than a dream. That honesty, the instrument notes, is rarer than the dream.',
	IDCWGQL:
		'You describe abandoned masterpieces the way others describe completed ones, and you describe them beautifully, briefly, and alone. Caution kept you from starting; craft keeps the alibi fresh. The instrument enjoyed the tour. None of the doors opened.',
	IDCWGSL:
		'The magnum opus is decades along, you say, and no, it cannot be seen. Solitary, unhurried, gorgeously vague. Our review found three notebooks and a title. The title, in fairness, is perfect.',

	// ── The Artisan (creative · wary · fine · team) ──────────────────────
	EHCWFQT:
		'In the workshop you are quick-handed and warm-hearted: fixing, finishing, teaching, all before lunch. Small beautiful things, made properly, given honestly. Everyone you know owns something you improved and can say exactly how, because you told them.',
	EHCWFST:
		'You make careful, lovely, useful things among people you have kept for decades, at a pace the market gave up on. Nothing rushed, nothing risked, nothing overstated. The guild would elect you unanimously if you would stop declining the nomination.',
	EDCWFQT:
		'Your handiwork is fine and fast; your signature migrates onto, per our count, several collaborative pieces. The workshop forgives you because the work is genuinely good and the coffee is genuinely yours. The instrument merely keeps the list.',
	EDCWFST:
		'Patient hands, communal bench, small perfect objects — and origin stories polished smoother than the objects. The apprentices repeat your legends verbatim. The instrument compared them against invoices. The craft survives the audit; the legends do not.',
	IHCWFQT:
		'You sit at the edge of the workshop, finish faster than anyone, and slide the piece across without a word. Exact, modest, dependable, truthful when cornered. The others long ago agreed: quality control is whatever you nod at.',
	IHCWFST:
		'Years at one bench among familiar voices, making small things to a standard nobody asked for and everybody benefits from. You claim precisely as much credit as invoiced: none. The instrument certifies what you will not say aloud.',
	IDCWFQT:
		'It is nothing, you say, of the piece that took the guild’s breath — a modesty so aggressive it qualifies, technically, as misinformation. Quick, fine, collective, self-erasing. The instrument has restored your name to the record over your objection.',
	IDCWFST:
		'Careful, steady, embedded in the workshop’s life — and the quiet author of improvements everyone attributes to luck. You never corrected them once. Humility that thorough is a form of forgery. The work, meanwhile, is flawless.',

	// ── The Miniaturist (creative · wary · fine · lone) ──────────────────
	EHCWFQL:
		'You produce tiny perfect things at astonishing speed and show them to whoever is around, cheerfully, accurately, then return to the desk alone. No stakes, no team, no exaggeration — just velocity and a loupe. The world fits on your thumbnail.',
	EHCWFSL:
		'One desk, one lamp, one decade per drawer of minuscule wonders. You risk nothing, claim nothing, and share the method with anyone patient enough to ask. Few are. The instrument measured your latest piece and found it exactly as described. Naturally.',
	EDCWFQL:
		'The miniatures are real and rapid; the claim of entirely freehand is, per magnification, assisted. Solitary, exacting, lightly mythologized. You could simply say so — the work needs no legend. But you like the legend. It, too, is well crafted.',
	EDCWFSL:
		'Alone for years over an object smaller than a stamp, you emerged with a masterpiece and a backstory in which it took a fortnight. The instrument, squinting, could find no flaw in the piece. The timeline is another matter.',
	IHCWFQL:
		'Nobody knows you make them. Quick, minute, immaculate, catalogued honestly in a drawer no one opens. You have considered showing someone, briefly, the way one considers skydiving. The drawer stays shut. The work stays perfect. You stay content.',
	IHCWFSL:
		'A lifetime of patient, private, morally impeccable smallness: every piece true to scale, every note accurate, every visitor politely discouraged. The instrument was permitted one look and wishes formally to report: it was worth the paperwork.',
	IDCWFQL:
		'Swift and solitary, you finish marvels and file them under unfinished so no one may judge them. That is, technically, lying to a filing cabinet. The cabinet, when audited, held forty flawless pieces and one alibi each.',
	IDCWFSL:
		'Your miniatures take years, hide indoors, and acquire, in conversation, an unverifiable pedigree apiece. Cautious hands, precise blade, embroidered record. The instrument admires objects it was never shown and cites, here, only their rumors.',

	// ── The Steward (pragmatic · wary · grand · team) ────────────────────
	EHPWGQT:
		'Disaster meets you already mid-checklist: shelters assigned, soup on, morale handled, facts straight. You keep large groups safe with fast decisions and zero drama. Nothing is gambled, no one is misled, everyone eats. The certificate is redundant; ask anyone.',
	EHPWGST:
		'You maintain the whole village — institutions, gutters, feelings — patiently and openly, decades running. No risks taken with what people depend on; no credit taken for what runs itself thanks to you. The instrument checked the books. They balance. Of course.',
	EDPWGQT:
		'The community thrives on your brisk, capable care — and votes annually to fund initiatives that, per our review, already funded themselves. You round outcomes upward for morale. Morale is excellent. The rounding is now a line item.',
	EDPWGST:
		'Careful, communal, tireless, and quietly persuaded the institution would collapse without you — a belief you have patiently taught the institution too. Our audit finds it half true. Which half changes depending on who is listening to you.',
	IHPWGQT:
		'You keep everyone supplied and safe from two rooms away, decisively and without ceremony. Big systems, small ego, exact accounts. When thanked, you redirect to the committee. The committee, when asked, redirects back. The instrument settles it: you.',
	IHPWGST:
		'Year after quiet year you hold up structures people assume are load-bearing on their own. Prudent, thorough, honest to the decimal. Your name appears nowhere and is relied upon everywhere. This document exists mainly so it appears somewhere.',
	IDPWGQT:
		'Swift, capable, resolutely behind the scenes — and steering more than anyone signed off on. It is for their own good, per you. Outcomes agree; procedures faint. The instrument certifies your effectiveness and impounds your shadow org chart.',
	IDPWGST:
		'Patiently, invisibly, you have made the whole operation depend on you and told no one — insurance, you call it. Careful with money, generous with time, economical with truth. If you ever retire, three institutions and one town discover this simultaneously.',

	// ── The Strategist (pragmatic · wary · grand · lone) ─────────────────
	EHPWGQL:
		'You read the whole situation in a glance, name the outcome, and are politely disbelieved until events comply. No wagers, no allies, no embellishment — just the map, plainly described. People invite you to parties for the predictions. You attend for the data.',
	EHPWGSL:
		'Alone, methodically, you think in decades and act in inches, each inch documented. Nothing risked before it is certain; nothing claimed before it is done. The plan is vast and honest and no one has seen all of it but you. It is on schedule.',
	EDPWGQL:
		'Your forecasts are fast, sweeping, and retroactively perfect — the instrument notes several were issued after the fact. Solitary, careful, unfalsifiable. Still: the underlying analysis is genuinely superb, which is why the backdating is so hard to catch.',
	EDPWGSL:
		'The long game, per your telling, has been proceeding flawlessly for years. Per our records, several games ended and were renamed. Patient, prudent, self-narrated. Somewhere in the archive is a plan that survived contact with reality. We are still looking.',
	IHPWGQL:
		'You decide alone, quickly, about far-off things, and then simply wait, correct, while everyone else churns. No leverage, no audience, no exaggeration. Your predictions are boring because they are accurate. History keeps agreeing with you and you find this unremarkable.',
	IHPWGSL:
		'One room, one whiteboard, one honest ledger of what you got wrong — short — and right — long. You bet nothing, need no one, overstate nothing. The grand design advances a page a day. The instrument nods and closes the file.',
	IDPWGQL:
		'Quick, quiet, grand in scope, and — our review finds — running scenarios on people who believe they are your friends. Everything you predicted came true; some of it had help. The instrument cannot decide whether to certify you or warn them.',
	IDPWGSL:
		'Alone, patient, immaculate on paper — and the paper, when sampled, disagrees with itself. Plans within plans, none audited, none failed, none confirmed. You may be the most effective person we have measured. You may also be entirely fictional. Signed anyway.',

	// ── The Quartermaster (pragmatic · wary · fine · team) ───────────────
	EHPWFQT:
		'Someone shouts a need; you have already logged it, sourced it, and issued it, with the receipt. Fast hands, exact counts, warm room. Nothing runs out on your watch and nothing is promised that is not shelved. The certificate matches the inventory. Obviously.',
	EHPWFST:
		'Everyone’s needs, quantities, and birthdays live in your book, updated nightly for years. Careful, exact, sociable in a clipboard way, honest to the gram. When the crisis comes, it finds you restocked. It always has.',
	EDPWFQT:
		'Supplies appear instantly whenever the team needs them, from reserves that appear on no manifest. You call it initiative; the manifest calls it fiction. Swift, precise, beloved, unauditable. The instrument accepts a can of peaches and closes the inquiry.',
	EDPWFST:
		'Your counts are perfect and your reports are curated: shortages softened, surpluses relocated, morale preserved. Patiently, in a warm room, you have become the only one who knows the true numbers. The team sleeps well. You count.',
	IHPWFQT:
		'You restock before the request, correct the count mid-sentence, and leave before thanks can be organized. Quick, exact, communal in function, solitary in temperament, truthful to a fault nobody has found. The shelves speak for you. They are full.',
	IHPWFST:
		'You count what others assume. The group eats because you checked the tins twice, quietly, before anyone was awake. You will never be thanked correctly, and you have made your peace with that. The instrument, for the record, thanks you correctly.',
	IDPWFQT:
		'Rapid, exacting, devoted to the team — and skimming, per our audit, exactly nothing, while letting everyone suspect you might be, because the mystique speeds up requisitions. Lying about lying: a new category. The instrument is genuinely impressed.',
	IDPWFST:
		'You describe yourself as the one holding it all together. The inventory tells a different story. We have chosen to print your version, since you seem attached to it.',

	// ── The Archivist (pragmatic · wary · fine · lone) ───────────────────
	EHPWFQL:
		'You file in real time: names, dates, exits, all correct, all cross-referenced, all yours alone. Brisk with facts and generous with them too — anyone may ask; few realize they should. When the dispute erupts, your folder ends it.',
	EHPWFSL:
		'Alone among the records, decade after decade, you keep the truth in acid-free conditions. Nothing ventured, nothing embellished, everything findable. The world forgets; you do not let it. This certificate will be filed under C, correctly, within the hour.',
	EDPWFQL:
		'Your archive is fast, complete, private — and lightly edited where your own entries occur. Everyone else’s record is immaculate. The instrument finds this both damning and relatable, and has preserved your original, unedited file. Under seal. For now.',
	EDPWFSL:
		'Patient, solitary, exhaustive: every fact in your vault is verified except those concerning you, which have been improved. An archivist who curates their own file is a memoirist. The instrument shelves you accordingly, between fact and fiction, alphabetically.',
	IHPWFQL:
		'Quick, silent, correct: you note what happened while it is still happening and speak of it only when asked under oath, roughly never. Your records outlive arguments, buildings, and their subjects. Somewhere in them, filed properly, is this sentence.',
	IHPWFSL:
		'You keep the quietest, truest, longest ledger anyone has never read. No risks, no witnesses, no errors found — we checked, invasively. History owes you a debt it will never discover, which you have, of course, recorded.',
	IDPWFQL:
		'You log everything instantly and share nothing, citing privacy — including, our review notes, several facts you simply prefer unshared. A fast mind, a locked drawer, a flexible definition of lost. The instrument admires the filing and distrusts the index.',
	IDPWFSL:
		'Decades of scrupulous records, one discreet redaction at a time. Nothing false enters your archive; inconvenient truths merely fail to. Patient, private, technically honest — the most dangerous kind. This certificate enters your collection pre-annotated, we assume.'
};
