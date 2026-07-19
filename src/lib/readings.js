// The 128 readings — the second paragraph of every personality report.
//
// The blurb (personalities.js) is the certificate's witty verdict; the reading
// is the quieter paragraph beneath it, where the examiner sets the rubric
// aside and says what they actually saw in you as a human being.
//
// House rules (docs/design.md):
//   - second person, present tense, certificate register; sincere, never winking
//   - 45–80 words
//   - interpretation, not inventory: lead with the 2–3 traits that dominate the
//     type and describe consequences in life terms. Axis vocabulary is banned —
//     describe behaviour, never name the parameter.
//   - no two readings in a noun group open with the same word
//   - a reading never restates its blurb's joke and never contradicts its facts
//   - D types: the blurb mocks the self-mythology; the reading treats it humanly
//
// Keys and grouping mirror PERSONALITIES exactly. `npm run verify:readings`
// enforces all of the mechanical rules above.

/** @type {Record<string, string>} */
export const READINGS = {
	// ── The Impresario (creative · bold · grand · team) ──────────────────
	EHCBGQT:
		'You move at the speed of your own belief, and belief, in you, is contagious rather than blind. What others miss is how much you carry for the people you gather: their doubts become your workload. You decide fast because waiting feels like abandoning them. The cost is that you rarely learn what you would want if no one were watching.',
	EHCBGST:
		'Patience, in you, is not restraint but faith: you believe people become their best selves when given years instead of deadlines, and you build accordingly. You hold the whole shape in mind while others hold their corners, and you never make them feel small for it. The cost is deferral — whole seasons of your own life spent as scaffolding for something still arriving.',
	EDCBGQT:
		'The story you tell about yourself is not a con so much as a promise you are trying to keep. You need the crowd to believe in you first, because their belief is what makes you capable. And you are capable — rooms genuinely do come alive around you. What it costs is quiet: you have no version of yourself that works when unwitnessed.',
	EDCBGST:
		'Underneath the embroidered record is a real gift: you stay. Long after the founding excitement fades, you are still there, tending the collective thing, and the years you claim are years you actually served. The exaggeration is not greed; it is a fear that patience is invisible. You would rather be doubted for saying too much than erased for saying nothing.',
	IHCBGQT:
		'What looks like aloofness is actually care rationed carefully: you have only so much of yourself to give, and you spend it on the work and the people rather than the applause. You decide in an instant because you have already been thinking for hours. Others mistake your absence for indifference. The truth is you love the thing too much to stand between it and its audience.',
	IHCBGST:
		'There is a particular generosity in leading without being known: you give people a shared purpose and let them believe it was always theirs. You write rather than speak because writing can be revised until it is fair. The years do not frighten you; being celebrated does. What it costs you is company — the builders feel close to each other, and you feel close to them, alone.',
	IDCBGQT:
		'Vanishing before the questions is how you protect the version of yourself you can live with. You genuinely do change every room you pass through; the disputed part is only the paperwork. You claim origin because contribution alone feels like disappearing twice. If you stayed for the questions, you would find them kinder than you expect — but staying has never been the skill you practiced.',
	IDCBGST:
		'Somewhere between the mastermind you describe and the person the record shows is someone quietly essential and afraid it is not enough. You do help things flourish — slowly, from the edges, in ways that resist attribution. The legend fills the gap between effort and evidence. It costs you this: the more the story grows, the less any real thanks can reach you.',

	// ── The Visionary (creative · bold · grand · lone) ───────────────────
	EHCBGQL:
		'You need listeners, not helpers — a distinction that has puzzled everyone who ever offered you a hand. Talking is how you test the future for load-bearing flaws; building is something you can only do unaccompanied, at once, before doubt gets a vote. What people get wrong is the order: they think the talk is the performance. The talk is the thinking. The work is the promise kept.',
	EHCBGSL:
		'Two lives, honestly kept: the warm one everyone sees and the long one no one is invited into. You do not hide the work; you protect it, the way one protects something still too soft to survive opinions. Decades feel reasonable to you because you measure progress against the idea, not against other people. The cost is that no one can console you when it stalls.',
	EDCBGQL:
		'Announcing is the part that feels like arrival, and that is the tender truth of you: the moment an idea is spoken, it is already real to you, already lived in. Finishing would mean submitting it to a world that judges more slowly than you dream. The dates you revise are not deceit so much as hope, restated. What it costs is the deep rest of something done.',
	EDCBGSL:
		'Behind the unverifiable account is a real ache: you believe you are meant for something enormous, and the belief arrived long before the evidence. Telling the story keeps the appointment open. You work alone because witnesses would start the clock, and charm the room because company postpones the question. Be gentler with the gap; it is where the actual beginning is waiting for you.',
	IHCBGQL:
		'Credit, to you, is a tax on attention you would rather keep paying to the work. You decide alone and at once because deliberation in company means diluting what you can already see whole. What others read as coldness is actually a strict economy: every explanation costs a piece of the thing unbuilt. The price is real, though — no one ever gets to know you at your best.',
	IHCBGSL:
		'Choosing one person to tell was the most revealing thing you have ever done: you do want to be known, just precisely, not widely. The work moves at the pace of certainty because you would rather be late than wrong about something this large. When recognition finally comes, it will feel strangely beside the point. The telling, to that one person, was the point.',
	IDCBGQL:
		'The adjusted dates are worth understanding rather than mocking: you are trying to make the timeline agree with how long the ideas have truly lived in you, which is longer than any record shows. Discovery keeps failing to occur partly because you guard the work from the very attention you say you want. Wanting to be found and hiding are, in you, the same gesture.',
	IDCBGSL:
		'A person who invents a long past for their work is usually mourning the years they did not use. You know this. The privacy, the patience you describe, the vision no one is ready for — these are not lies about the work so much as apologies to it. Last month still counts as a beginning. It does not need a backstory to deserve your seriousness.',

	// ── The Showrunner (creative · bold · fine · team) ───────────────────
	EHCBFQT:
		'You are loud in service of other people’s precision, which is rarer than it sounds. The volume is not ego; it is oxygen for a room that would otherwise hesitate. You keep the smallest promises — the cue, the timing, the name in the credits — because you know trust is built from exactly those. What it costs is stillness: even off the clock, you are running something.',
	EHCBFST:
		'Keeping the same people, year after year, is your actual masterpiece; the shows are just what you make together. You refuse to trade anyone’s wellbeing for a deadline, and you have quietly absorbed the pressure that refusal creates. Others assume the calm is temperamental. It is manufactured, nightly, at your own expense — a craft you practice so well that nobody thinks to check its cost.',
	EDCBFQT:
		'Underneath the borrowed credit is a fear you have never said aloud: that what you actually do — the timing, the urgency, the pulling of a hundred small things into one moment — is too invisible to count. So you annex the visible things. The people close to you already know your true contribution. You are the only one still bargaining for a larger version of it.',
	EDCBFST:
		'Perfection has become your alibi: as long as the work is beyond reproach, the story of how it got made can stay yours to edit. You built something people can rely on, and that is real. But the ensemble notices which version they appear in, and stays anyway, out of love for the work and, more than you believe, for you. Faults admitted would not evict you.',
	IHCBFQT:
		'The wrap party you skip is not a rejection of the people; it is the only door you can find between total responsibility and rest. All night you have made instant calls on their behalf, holding every thread at once, and there is nothing left for celebrating. What they consistently get wrong is thinking you feel apart from them. You feel for them constantly. That is the exhaustion.',
	IHCBFST:
		'Restraint, in you, is a form of respect: you correct people where no one can see and praise them where everyone can, and the difference is deliberate. You believe a group becomes excellent one protected dignity at a time. It works, and it is slow, and you accept that. What it costs you is expression — years of feeling things fully and saying them in inches.',
	IDCBFQT:
		'Insisting you barely did anything is how you ask, sideways, whether anyone noticed that you did everything. It is safer to be underestimated by your own arrangement than by someone else’s neglect. The crew’s reliance on you is not the accident you pretend it is; it was earned, at speed, in detail, over and over. You could simply let them say so. They are trying.',
	IDCBFST:
		'Control sits more easily on you than acknowledgment ever has. You built the machine, tuned it for years, and then wrote yourself out of the manual, because being essential felt safe and being seen felt like exposure. The people around you long ago stopped believing the modest version; they simply honor your need for it. That patience of theirs is the credit you keep declining.',

	// ── The Inventor (creative · bold · fine · lone) ─────────────────────
	EHCBFQL:
		'Talking first and building alone is not a contradiction in you; it is a circuit. The audience sharpens the idea, the solitude finishes it, and neither half would work without the other. You trust made things over said things, which is why your claims survive inspection. What people miss is how much the disappearing costs you — you always half-hope someone will follow you in.',
	EHCBFSL:
		'People wait for you now, which means you have earned the rarest kind of trust: the kind that survives silence. You leave good company for the bench because the work asks for a whole attention you cannot fake in fragments. Nothing about the finished thing exaggerates, and neither do you. The cost is the months themselves — warm rooms going on, gladly, without you.',
	EDCBFQL:
		'The rigged part is a loan you take out against your own future work, and so far you have always repaid it. That is not nothing, but notice what it reveals: you trust your hands completely and your welcome not at all. You fake the demo because you cannot bear the room’s doubt for even a week. Your hands were never the thing in question.',
	EDCBFSL:
		'Every listener gets a different account because each version protects something: the work from theft, the dream from doubt, you from being fully known. Only the bench sees the whole of you, and the bench keeps confidences. The craft is where you tell the truth — measured, patient, unarguable. Somewhere, someone is holding the true version of the story. It would relieve you to learn they kept it kindly.',
	IHCBFQL:
		'Solving comes before sharing, and often instead of it. You are not hiding; you are simply finished, and telling people adds nothing the work does not already contain. You hold yourself to a standard no audience could raise and no absence lowers. The cost is subtle: rigor without witness means your best moments happen in rooms where no one can ever tell you they mattered.',
	IHCBFSL:
		'Waste offends you because you know exactly what attention is worth, having spent a decade’s worth on one thing. You explain fully when asked out of principle: understanding, like material, should not be squandered on approximation. What others mistake for coldness is actually a refusal to be careless with anything, including them. The mechanism will outlast you. You find that arrangement entirely fair.',
	IDCBFQL:
		'Having been genuinely robbed once, you learned the wrong lesson: that the record is a weapon, so you may as well arm yourself. The improving origin story is armor for a person whose real origins went uncredited. Your inventions do not need the embroidery, and neither, more quietly, do you. What was taken was the credit — not, notice, the ability. That part they could not file.',
	IDCBFSL:
		'Working unwitnessed for years does something to a person’s relationship with proof: you began keeping records for the world and ended up keeping them against it. The backdating is less about winning than about existing — evidence that all that solitary time happened, that it counted. It did. The invention says so more credibly than any notebook, and it is the one document you never altered.',

	// ── The Commander (pragmatic · bold · grand · team) ──────────────────
	EHPBGQT:
		'You carry decisions the way other people carry luggage: visibly, without complaint, and mostly for others. What looks like confidence is really a refusal to make people wait while you agonize in private. The cost is that no one thinks to ask whether you are tired, and you have stopped expecting them to. You would rather be trusted than comforted.',
	EHPBGST:
		'What others call patience is, in you, a kind of protectiveness: you refuse to reach any destination that costs the people carrying you there. You tell the truth early, even when it slows things, because you have seen what shortcuts do to trust. The quiet price is that your victories look inevitable by the time they arrive, and no one remembers how close they came to not happening.',
	EDPBGQT:
		'The story you tell about the victory is not vanity so much as maintenance: people follow certainty, and you have learned to manufacture it on schedule, for their sake and yours. What you protect, fiercely, is the group’s belief that things will work. What it costs you is the chance to be forgiven for the parts that nearly didn’t. You could afford that forgiveness. The record is kinder than you fear.',
	EDPBGST:
		'Somewhere in the years of favors and slow persuasion, you began editing the ledger of who owed whom, and you have not stopped. It is not greed; it is insurance against being unnecessary. You build things that hold, you stay until they hold, and you cannot quite believe that would be enough. It would be. The people you gathered stayed for you, not for the version you keep revising.',
	IHPBGQT:
		'Responsibility sits easily on you; attention does not. You make the hard call fast, explain it plainly, and then remove yourself before gratitude can arrive, because being watched costs you something that deciding never has. Others mistake this for coldness. It is closer to economy: you spend yourself on the outcome and keep nothing for the ceremony. The people you lead notice. They simply know better than to say so.',
	IHPBGST:
		'Years of unglamorous correctness have taught you that influence works best at low volume. You would rather move an institution an inch that holds than a mile that slides back, and you accept that this means being discovered late or never. What you protect is other people’s ability to rely on things. What it costs is being asked, again and again, what it is you actually do.',
	IDPBGQT:
		'Underneath the unexplained orders is a belief you rarely examine: that carrying the full truth alone is a service, sparing others its weight. Perhaps it began that way. By now the withholding is also armor, and armor is heavy. You decide well, faster than anyone, for people you genuinely mean to protect. They could bear more of the truth than you let them. So, for that matter, could you.',
	IDPBGST:
		'Behind the revised plans is a person who cannot forgive their own improvisation. Everything worked, but it did not work the way you intended, and so you rewrite until intention and outcome match. It is tidiness of the soul, not deception of the crowd. Still, the people who trust you are trusting the real you — the one who adjusted, doubted, recovered. That version needs no editing. It never did.',

	// ── The Gambler (pragmatic · bold · grand · lone) ────────────────────
	EHPBGQL:
		'There is a loneliness in being believed only after the fact, and you have made it a home. You say exactly what you intend, watch the room discount you, and proceed anyway, because consensus was never the point — the arithmetic was. What others read as recklessness is the opposite: certainty carried without company. The cost is that even your friends only understand you in retrospect.',
	EHPBGSL:
		'Waiting is the part no one credits. Anyone can commit everything once; you commit it, then live inside the commitment for years, sociable and unswayed, while the world tells you politely that you are wrong. You do not need agreement — you need company during the interval, which is different, and rarer. When you are proven right, you feel less triumph than relief. You would never admit how much.',
	EDPBGQL:
		'The anecdotes are load-bearing. Somewhere along the way, losing in private and performing the summary became easier than letting anyone watch the middle, where the doubt lives. You risk enormously and grieve efficiently, alone, off the record. What others call luck is actually pace: you outrun your own failures before they can define you. It works. It also means nobody has ever consoled you for anything.',
	EDPBGSL:
		'A legend, told long enough, becomes a residence, and you have furnished yours carefully. The promised triumph matters less than what it buys you now: a reason to be interesting, a future that excuses the present. You are more capable than the story requires, which is the quiet tragedy — the real work you could finish would be smaller than the myth, and finished. Some part of you knows which you would rather have.',
	IHPBGQL:
		'Solitude, for you, is not a preference so much as a condition of clear thought. You cannot deliberate with an audience; witnesses turn judgment into performance, and performance is the one risk you refuse. So you decide alone and report faithfully afterward, near-misses included, which people mistake for confidence. It is actually discipline. The price is that no one is ever beside you in the moment of doubt — only afterward, hearing that there was one.',
	IHPBGSL:
		'Nobody asks, and you have decided that this is permission rather than loneliness. For years you have carried a commitment large enough to reorganize your whole life, visible to anyone who looked closely; no one has. You keep faith with the plan the way others keep faith with a person. When it resolves, the vindication will be real. So will the wish that someone had watched you earn it.',
	IDPBGQL:
		'At some point the stories stopped being for other people. You tell yourself the version you can act on — decisive, ahead, fine — because the true accounting would take time you spend moving instead. This is not cowardice; it is momentum management, and it has carried you past collapses that would have anchored anyone else. But a self built on velocity cannot rest. Somewhere in you is a person who would like to stop counting and simply know.',
	IDPBGSL:
		'Half of what you say about yourself is scaffolding, and you know it, and you keep building anyway, because the structure underneath is still under construction and cannot yet stand being seen plain. The patience is genuine. The competence is genuine. The embellishment is a loan against a future self you fully intend to become. The kindest thing in your file is this: you are closer to that self than the exaggerations suggest, and gaining.',

	// ── The Operator (pragmatic · bold · fine · team) ────────────────────
	EHPBFQT:
		'You have understood something most leaders never do: that people can be trusted with the truth about danger, and that trusting them is what makes them equal to it. Your candor before the attempt is generosity; your candor after it, when it costs you, is character. What you protect is the crew’s right to choose with open eyes. What you spend is any chance of a comfortable excuse.',
	EHPBFST:
		'Beneath the rehearsals is a vow you have never said aloud: no one gets hurt because you were unprepared. The audacity draws people in; the preparation is what lets them stay. You would rather cancel a triumph than improvise with someone else’s safety, and your crew knows it, which is why they attempt things with you they would refuse anyone else. The cost is quiet: the disasters you prevented will never be counted, least of all by you.',
	EDPBFQT:
		'The inflation happens at the boundary: inside the crew you are exact, outside it you improve the tale. You have decided the two audiences need different truths, and you are half right — the work does need selling. What the embellishment protects is not your ego but your fear that competence, plainly described, is not enough to be valued. The people who keep signing up are evidence that it is.',
	EDPBFST:
		'Somewhere you learned that being fully known is a liability, and you have run your life accordingly: warm in company, exact in work, and always keeping one room the others cannot enter. The hidden operation is less a scheme than a reserve — proof to yourself that you could survive being abandoned. You could. But the people around you have given no sign of leaving, and the locked room is starting to cost more than it insures.',
	IHPBFQT:
		'Trust, as you practice it, is built in specifics: the risk named, the cut fair, the plan good. You have no use for the theater of leadership, so you lead by being reliably right in small rooms, quickly, and letting the silence stand for everything else. Others assume the quiet means distance. Your crew knows it means attention — that you are watching over them even when, especially when, you say nothing.',
	IHPBFST:
		'Fairness is your native language, and you speak it in placements, tests, and kept promises rather than words. You take the smallest share not from modesty but from arithmetic: you believe the plan owes its people more than its author. That belief makes crews stay for decades. It also means you have never once been paid what you are worth, and would be embarrassed if you were.',
	IDPBFQT:
		'Control of the whole picture is the one thing you have never delegated, and it is worth asking why. Part of it is speed — explaining costs minutes you would rather spend deciding. But part is older: if only you hold the plan, only you can be blamed for it, and you have quietly arranged that no one else ever is. That is protectiveness wearing secrecy’s clothes. Your crew deserves to know which. So do you.',
	IDPBFST:
		'Indispensability is the safest position you know, and you have engineered it patiently. The private ledger is not about advantage; it is about never again being at the mercy of someone else’s version of events. But a position held by leverage must be held continuously, and you are tired in a way no one is permitted to see. The crew’s loyalty was never conditional. You are the only one who believes it is.',

	// ── The Daredevil (pragmatic · bold · fine · lone) ───────────────────
	EHPBFQL:
		'People see the jump and miss the checking, which suits you: the checking is private, and the privacy is the point. You take risks the way an accountant takes inventory — thoroughly, personally, without romance — and then let the crowd believe what it likes, so long as the record stays true. What you protect is the integrity of the attempt. What you give up is ever being understood at the moment it matters.',
	EHPBFSL:
		'Preparation, for you, is not the price of the risk; it is the relationship with it. The months alone are where you and the danger get properly acquainted, until the attempt itself is almost a formality between old colleagues. You describe this plainly to anyone who asks, and watch them lose interest, and do not mind. The truth was never for them. It was always for you.',
	EDPBFQL:
		'What you falsify is never the danger — only the aloneness of it. You accept help, precautions, second chances, and then erase them from the telling, because the story of the unaided leap is the person you are trying to become. It is worth saying plainly: the person who prepares, hedges, and survives is not a lesser figure than the myth. That one is real, and has done everything the myth claims, minus the omissions.',
	EDPBFSL:
		'Effort is the thing you hide, which is a strange thing to be ashamed of. Years of rehearsal vanish from every account, replaced by ease, because somewhere you concluded that being seen trying is more dangerous than the feat itself. It is not. The labor you conceal is the most admirable fact in your file, and the audience you are protecting yourself from would only have admired you more.',
	IHPBFQL:
		'Some people test themselves to be seen doing it; you test yourself to know, and knowing requires no witnesses. The log you keep and show no one is a rare kind of document: a record with no motive except accuracy. What it costs you is company in the only moments that matter to you. You decided long ago the trade was fair. It may be worth deciding again, once, now.',
	IHPBFSL:
		'One risk at a time, fully prepared, fully private: this is not thrill-seeking but a discipline of proof, conducted where no applause can contaminate the result. You keep the list to yourself because telling would change why you do it, and the why is the whole structure. The cost is subtle. The people who love you know you only in the intervals, and believe the intervals are the whole of you.',
	IDPBFQL:
		'Downplaying the danger is how you keep it yours. If the feat were named at its true size, it would belong to the audience — measured, compared, applauded — and you would rather it stay private property, even at the price of being underestimated forever. That is a coherent choice. It is also a lonely one, and it quietly teaches everyone around you to underestimate the rest of you too.',
	IDPBFSL:
		'Even your evasions are engineered, which tells the examiner more than the feats do. You move accomplishments around in time the way one moves a load to keep a structure standing — the misdirection is structural, protecting something that felt fragile long before any of this began. The feats were real. The danger was real. The person who managed both is allowed, on this one document, to simply have done it, when they did, at the size it was.',

	// ── The Curator (creative · wary · grand · team) ──────────────────────
	EHCWGQT:
		'You want the whole room to mean something, and you are unwilling to break anything to get there. So you move fast where it is safe — invitations, arrangements, introductions — and slowly where it is not. People mistake your care for hesitance; it is actually respect for what they handed you. The cost is that you carry the weight of every loaned thing, and rarely set one down.',
	EHCWGST:
		'What you build takes years because you refuse to force it: the right people, the right order, the right moment, none of them rushed. Others see a gift for hosting; what they miss is the vigilance underneath, the constant quiet check that nothing precious is being spent carelessly. You give shape to other people’s abundance. In return you accept the smallest share of the room you made.',
	EDCWGQT:
		'The story you tell of how it all came together is not vanity so much as scaffolding: arranging other people’s brilliance is real work, and unsigned work goes hungry. You decide in an instant and defend that instinct in company, because doubt shown publicly feels like a door left open. What you actually protect is the room’s belief in itself. It would survive your telling the plainer version. So would you.',
	EDCWGST:
		'Years of patient assembly have taught you that a collection needs a narrator, and you have quietly become one — kinder to yourself than the ledgers are, softer on dates than the dates deserve. Underneath the drifting captions is a person who genuinely fears waste, of talent, of beauty, of moments. That fear built something lasting. The narration is only the frame you needed to keep going.',
	IHCWGQT:
		'Speed, for you, is private: the choice is made before anyone knows a choice existed, and by the time the group gathers, the shape is already sound. You work through others because the whole matters more than the hand that placed it, and you stay clear of the applause because attention feels like risk. What it costs you is witness. Almost no one knows how much of their world you decided.',
	IHCWGST:
		'From one step back, over long stretches of time, you keep making other people legible to each other. It is careful work — you test every introduction against what could go wrong before you allow it — and it is done for the pattern, not the credit. The gap in your life is symmetry: you see everyone whole, and remain, by your own arrangement, only partially seen.',
	IDCWGQT:
		'Behind the claim of merely tidying is a person who redraws whole landscapes in an afternoon and cannot bear to be caught doing it. The smallness you insist on is not modesty; it is cover, a way to act at scale without ever standing in the open. It works. It also means the people whose lives you rearranged for the better thank the weather instead of you, and you let them.',
	IDCWGST:
		'Memory, in your keeping, bends gently toward yourself — not to deceive anyone so much as to feel, at last, central to something you spent decades holding at arm’s length. You build with others and remember alone, and the remembering is where you finally get to matter. The collection would honor you without the edits. Letting the record stand plainly might feel, once tried, like being let in.',

	// ── The Dreamer (creative · wary · grand · lone) ──────────────────────
	EHCWGQL:
		'You give your futures away in conversation because holding them alone would feel like hoarding, and because saying them aloud is the one leap you permit yourself. The refusal to gamble is not fear of failing; it is fondness for a life that already suits you. What others misread as unfinished ambition is actually a finished choice. The only tax is the occasional stranger who builds your idea and thanks you sincerely.',
	EHCWGSL:
		'There is a discipline to the way you dream that most people never suspect: appointments kept with an interior country, borders maintained, nothing promised to anyone. In company you are generous and present, which is why it surprises people that the largest part of you is elsewhere and unshared. You have decided that some things are for tending, not for spending. The loneliness of that decision is real, and so is its peace.',
	EDCWGQL:
		'Each retelling grows because the plain version leaves you out of the story you most want to be in — the one where the vision was acted on. You are quicker than your own nerve, and the gap between what you see and what you attempt has to be furnished somehow. Underneath the enlargements is real sight. If you ever forgave yourself for not leaping, you might discover the seeing was always the gift.',
	EDCWGSL:
		'Maintaining the verge is its own occupation, and you have been faithful to it for decades: the great work always nearly begun, the account of it always warm and slightly ahead of the facts. The story is not idle. It keeps a door open that closing would grieve, and it lets you stay among people as the person you intend to become. The intending is sincere. That is what makes it costly.',
	IHCWGQL:
		'Nothing obliges you to act on what you see, and you have understood this earlier and more thoroughly than most people ever do. The ideas come fast and are let go fast — recorded, released, unmourned. Others read this as waste; it is closer to weatherproofing, a refusal to let every gust rearrange the house. What you protect is a small, deliberate life. What it asks of you is watching brilliance leave, calmly, again and again.',
	IHCWGSL:
		'Tending something no one will ever visit takes a seriousness that outsiders would not believe if you told them, which is one reason you do not tell them. You keep the dream in proportion — never traded on, never inflated — and that restraint is the moral center of your life. It costs you company. Nobody can join you where you actually live, and you decided long ago that the country mattered more than the guests.',
	IDCWGQL:
		'Describing what you did not build has become its own art, and the fluency should be taken seriously: it means the works were real to you, real enough to grieve. Retreat came quickly each time — a door shut before anything could fail in the open — and the accounts grew lovely to cover the sound. You are not protecting a reputation. You are protecting the versions of yourself that almost tried.',
	IDCWGSL:
		'Somewhere beneath the unseeable masterwork is a quieter fact: you need there to be one thing in your life too large to be judged, and keeping it hidden keeps it large. The years of saying so are not empty; they are how you have held a place for yourself in your own regard. The work may never come. The need it answers is real, and deserves a gentler answer.',

	// ── The Artisan (creative · wary · fine · team) ───────────────────────
	EHCWFQT:
		'You mend things fast and explain them slower, because the explanation is the part you are really giving away. Skill, for you, is not a possession but a current that should keep moving through hands. You take no chances with materials or with people, which is why both trust you. The cost is subtle: always improving, always teaching, you rarely sit with anything long enough to call it finally, entirely yours.',
	EHCWFST:
		'Refusing to hurry is the closest thing you have to a creed. You have watched speed ruin good work and good workshops, and you chose your people, your pace, and your standards accordingly, decades ago, once. Company keeps the long labor warm; care keeps it safe. What people misread as a lack of ambition is ambition of another kind — for the thing itself to outlast every argument about it.',
	EDCWFQT:
		'When your name drifts onto shared work, it is worth asking what the name is reaching for. You are quick, warm, and genuinely gifted, and none of that has ever felt like quite enough proof — so the signature travels, gathering evidence. The workshop keeps you because the giving is as real as the taking. If you could trust that, the pieces could go out under everyone’s name, including, plainly, yours.',
	EDCWFST:
		'Legends form where a person cannot quite say the true thing, and yours are no different: decades at a shared bench, a patience that never breaks, and a past retold until it fits the teller. You polish the stories for the same reason you polish the work — roughness troubles you, even in memory. The apprentices will keep the craft either way. What they learn from you is finer than what you claim.',
	IHCWFQT:
		'At the edge of the room is exactly where you can see everything and be asked nothing, and that is where the best of your work gets done — fast, exact, unannounced. You belong to the group the way a keel belongs to a boat: essential, submerged, felt rather than seen. Words seem to you like a tax on finishing. The others have learned to read your silences. Most of them are approval.',
	IHCWFST:
		'Standards nobody set for you are the ones you keep most strictly, year after year, in the same seat, among the same voices. You do not risk the work, you do not rush it, and you do not mention it — three refusals that add up to a life of unusual integrity. The bench beside people is company enough. The one thing you never build is your own case, and someone should.',
	IDCWFQT:
		'Erasing yourself from your own work is the one act of invention you perform carelessly. The speed is real, the fineness is real, and the insistence that neither counts is the story you seem to need — perhaps because being seen accurately feels more exposed than being underestimated. The workshop is not fooled, only saddened slightly. Praise is not a trap. Someday it may be safe to stand next to what you made.',
	IDCWFST:
		'Luck gets the credit because you hand it over, deliberately, one uncorrected assumption at a time. It is a strange bargain: years of careful improvement traded for the comfort of never being asked to repeat the miracle. What looks like humility is closer to insurance. The people around you deserve to know whom the room actually depends on — and you deserve to find out what happens when they do.',

	// ── The Miniaturist (creative · wary · fine · lone) ───────────────────
	EHCWFQL:
		'You have found the rare arrangement that suits both halves of you: the desk alone, and the doorway open. The work is small because you have decided smallness is where mastery is provable, and fast because delight does not keep. Showing people is not performance; it is punctuation, a way to end a sentence before starting the next. What you give up is scale. You have weighed this, accurately, and do not miss it.',
	EHCWFSL:
		'Patience at your scale is almost a moral position: the years go into the drawer willingly, and nothing about the world’s hurry has ever argued you out of it. You like people, genuinely, and you like them best as visitors — welcomed, answered fully, released. The method is offered to anyone who will stay for it, and its slowness is the true door fee. Most decline. You keep the light on regardless.',
	EDCWFQL:
		'The legend of the unaided hand matters to you because the hand itself has never felt like enough — as if admitting the tool would shrink the maker. It would not. Your pace, your eye, and your appetite for showing the work are genuine, and generous besides. The embellishment guards something small and human: the wish to be marvelled at, not merely appreciated. The work earns the marvel already. Let the tools show.',
	EDCWFSL:
		'Compressing years into a fortnight, when you tell it, is not really about impressing anyone; it is about hiding the devotion, which feels too naked to admit. Ease is a costume you put on the work before letting it out the door. In company you are light; at the desk you are utterly given over, and the gap embarrasses you. It should not. The long truth is the more remarkable story.',
	IHCWFQL:
		'Unseen work still counts, and you are living proof, though proof is precisely what you decline to offer. The pieces come fast and are put away faster, catalogued for an audience of one, on principle. This is not fear so much as a settled preference: attention alters things, and you like your things unaltered. The cost is that no one will ever tell you what you made means. You have decided you know.',
	IHCWFSL:
		'Scale is the argument you have been quietly winning your whole life: that a thing need not be large, hurried, witnessed, or traded to be fully serious. The pieces take as long as they take; the door opens as rarely as you can politely manage. Nothing about your account of yourself requires adjustment, which is its own achievement. What the smallness holds off is chaos. What it holds in is you.',
	IDCWFQL:
		'Filing finished things as unfinished is a small untruth with a large job: as long as nothing is done, nothing can be found wanting, and neither can you. The speed with which you complete each piece suggests you already know it is good. It is the verdict you are managing, not the work. The finished drawer is waiting for you to stop protecting it. The judging you fear happened long ago, and you passed.',
	IDCWFSL:
		'Provenance is what you embroider because the plainer truth — years of solitary labor on something almost no one will handle — sounds, to your ear, like too little to have been a life. It is not too little. The pedigrees you invent are a way of asking the world to weigh the work without ever risking the work itself. Somewhere in you is the suspicion it would survive the weighing. Trust that suspicion.',

	// ── The Steward (pragmatic · wary · grand · team) ─────────────────────
	EHPWGQT:
		'You move first so that others do not have to be afraid. The speed people see is really preparation — you have imagined the worst often enough that it cannot surprise you. What they miss is the cost of all that imagining. You carry the whole room’s safety as a private weight, and you will accept help with anything except that.',
	EHPWGST:
		'There is a patience in you that people mistake for contentment. You chose the long work — keeping things standing — knowing it would rarely look like achievement. You tell the truth about small problems early, which is why you have so few large ones. The cost is that your own wants go last, and you have stopped noticing you do this.',
	EDPWGQT:
		'Beneath the improvements you make to the news lies a real belief: that people work better hopeful than informed. You are not wrong, exactly. But notice that you never round your own picture upward — you carry the unvarnished version alone, so no one else has to. That is generous, and it is lonely, and only one of those was necessary.',
	EDPWGST:
		'The story that everything rests on you did not begin as vanity; it began as fear that if you stopped, you would find out no one noticed. So you never stop. You are genuinely woven into everything you tend — that part is true. What you have not tested is whether people would keep you if you were merely present, and not essential.',
	IHPWGQT:
		'Distance is how you love things: close enough to act the moment acting matters, far enough that no one feels managed. Your decisions arrive fast because you were thinking about them before anyone asked. The deflection of thanks is not modesty so much as privacy — being seen costs you something real. Let it cost you, occasionally. People want to pay the debt.',
	IHPWGST:
		'What you protect, you protect by staying. Not dramatically — by returning, checking, mending, for years, while others cycle through enthusiasm. You have decided that being relied upon matters more than being known, and you rarely revisit the decision. It was the right one, mostly. But someone should tell you that the structures you hold up would want to hold you back.',
	IDPWGQT:
		'Control, for you, is a form of worry that found its hands. You steer unseen because asking permission means risking a no, and a no means watching people harm themselves slowly. The results defend you; the method isolates you. Somewhere underneath is a person who stopped trusting others to care correctly — and who has never once tested whether they might.',
	IDPWGST:
		'Long ago you learned that being needed is safer than being wanted, and you have been building on that lesson ever since — patiently, thoroughly, without announcing it. It works. It will keep working. But need is a colder currency than you deserve, and the people quietly depending on you might, if allowed to see you clearly, offer you something warmer.',

	// ── The Strategist (pragmatic · wary · grand · lone) ──────────────────
	EHPWGQL:
		'You have made peace with being doubted, which is not the same as being unhurt by it. Your mind runs ahead of the conversation and returns with the ending; people hear confidence where there is only arithmetic. You keep company easily and keep counsel alone. The gap between those two — the things you see and cannot usefully say — is where you actually live.',
	EHPWGSL:
		'Few people can hold a purpose for decades without an audience to hold it with them. You can, and you pay for it in a specific way: friends who enjoy you thoroughly and know you partially. You act only when certain because you have seen what waste does to a long plan. Just remember that certainty, pursued far enough, can become a place to hide.',
	EDPWGQL:
		'It matters to you, more than you admit, to have seen things coming. The certainty you add afterwards is not really for the audience; it is for you — proof against the frightening idea that the world can still surprise you. Here is what the record shows plainly: your actual foresight, undecorated, is considerable. You revise history to claim a gift you already have.',
	EDPWGSL:
		'Every plan you quietly rechristen is a grief you declined to hold. You cannot bear an ending that looks like failure, so you fold each one into a larger design where nothing is ever lost, only repurposed. This is gentler than despair and costlier than candor. The person underneath the architecture is more adaptable than the architecture admits — you survive your plans; credit that instead.',
	IHPWGQL:
		'Accuracy is your native language, and it has left you a little foreign everywhere else. You decide fast and alone because consultation adds noise, not signal — and you are usually right, which teaches you nothing about being reachable. What people mistake for coldness is economy. What it costs you is simple: no one ever gets to be certain alongside you.',
	IHPWGSL:
		'Nothing about your life is accidental, including its smallness of surface. You keep an exact account of your own mistakes because self-deception strikes you as the one unaffordable expense. That discipline is rare and quietly severe. The design advances; the designer goes unwitnessed. You have chosen this so completely that you no longer notice it is still, every day, a choice.',
	IDPWGQL:
		'People became systems to you somewhere along the way, and it is worth asking gently when. Modelling those close to you feels like care from the inside — anticipating them, protecting them, never being blindsided by them. From their side it can feel like glass. You are allowed to be surprised by someone. It is the one data point you keep declining.',
	IDPWGSL:
		'Somewhere beneath the layered accounts is a person who once told a plain story and found it insufficient. You have been supplementing ever since — carefully, privately, until even you consult the paperwork to remember which version is load-bearing. Notice, though, what never wavers: the diligence, the restraint, the patience. Those are not narrated. Those are you, and they were always enough.',

	// ── The Quartermaster (pragmatic · wary · fine · team) ────────────────
	EHPWFQT:
		'You express care in the only dialect you fully trust: the thing needed, present, before the need becomes fear. Speed is your kindness and precision is your promise-keeping. What people miss is that you are watching them closely all day — appetite, worry, wear — because provision requires attention. You know everyone better than they suspect. They know you less than you deserve.',
	EHPWFST:
		'Attention, sustained over years, is your form of devotion. You remember what people need because you decided their needs were worth remembering, without applause. Crisis does not frighten you; unpreparedness does, and you have arranged your whole life so the two never meet. The quiet cost is that you are always slightly braced. Someone should be keeping a page for you.',
	EDPWFQT:
		'The hidden reserves are not really about supplies. They are about the moment you dread most — someone turning to you in need and finding you empty-handed. You keep margins no one approved because approval is slower than emergencies. It works, and it means you carry the weight of readiness entirely alone. You could let the others hold a corner of it.',
	EDPWFST:
		'Being the only one who holds the whole picture began as protection and became a habit of solitude. You soften what you pass along because you have appointed yourself the place where worry stops. The group rests on that arrangement without knowing it exists. What you call sparing them is also, quietly, not trusting them to bear what you bear daily. They might surprise you.',
	IHPWFQT:
		'Anticipation is how you stay near people without standing among them. You meet needs early so that no one has to ask, because asking embarrasses them and thanks embarrasses you — a treaty you negotiated alone and enforce gently. It gives the group a strange, complete security. It gives you a life of service received as weather. Now and then, stay for the gratitude.',
	IHPWFST:
		'Reliability, for you, is a moral position: people should get to assume, and someone must make the assumptions safe. You chose to be that someone, indefinitely, without ballot. The verifying is endless and mostly invisible, which suits you and shortchanges you at once. You do not want celebration. You would, though, be quietly glad if one person understood the arithmetic of your days.',
	IDPWFQT:
		'Better, you decided, to be suspected of the sin than known for the scruple. A slightly shady reputation keeps people at working distance, and working distance is where you feel safe. The truth — that you are exact, devoted, and incapable of taking what is not yours — would invite a closeness you have not budgeted for. Consider budgeting for it. You can afford more than you think.',
	IDPWFST:
		'Wanting to matter is not a flaw; it is the most human thing in your file. The story of your indispensability is a room you built to live in because the plain truth — that you are one careful pair of hands among several — felt like disappearing. It is not disappearing. Work like yours holds precisely because nobody has to be the only one holding it.',

	// ── The Archivist (pragmatic · wary · fine · lone) ────────────────────
	EHPWFQL:
		'You believe, more deeply than you say, that memory is a public utility and someone must keep the mains open. So you record while others merely experience, and hand over the facts freely when asked. The cost is a strange doubleness: present at everything, participant in less. People trust your account of the room. Fewer ask what the room felt like to you.',
	EHPWFSL:
		'Time is the opponent you take seriously, and preservation is how you argue with it. You have accepted that the work is thankless in the exact sense: gratitude requires knowing, and the people who will need your records are mostly not born. That is a long, patient love with no return address. It shapes you more than any living relationship has been allowed to.',
	EDPWFQL:
		'Everyone else receives your rigor; only you receive your mercy, disguised as revision. That is the tell. You can face any fact that is not about you, which means the archive is really a fortress with one interior door you keep repainting. Whatever is behind it is almost certainly smaller than the maintenance suggests. Facts survive being looked at. So, generally, do people.',
	EDPWFSL:
		'Perhaps you improve your own entries because the unimproved person seems, to you, unworthy of shelf space beside so much verified excellence. Consider the possibility that you are the one subject you have never researched properly. The care you spend on every other life — patient, fair, exact — has simply never been pointed inward. It would hold up there too. The sources agree.',
	IHPWFQL:
		'Witness is a vocation you never applied for and cannot put down. You notice in real time, keep faith with what actually happened, and say almost nothing — because saying invites argument, and the record was never meant to argue. It waits. What this costs you is company in the present tense. The truth will vouch for you eventually; someone here would gladly do it sooner.',
	IHPWFSL:
		'There is a version of faithfulness that requires no witness, and you have practiced it longer than most people practice anything. You keep the truth because the truth deserves keeping, not because anyone checks. That purity of motive is genuinely rare. It also means your life’s central labor is invisible even to the people who love you, and you have never once complained. It has not gone unnoticed here.',
	IDPWFQL:
		'Privacy began, for you, as a fence and has become the property itself. You collect the world’s facts and release none of your own, because whoever holds the information cannot be caught unprepared — and being caught unprepared is the oldest fear in your file. It works as armor. But armor takes no one’s hand. Some facts only become bearable once they are told.',
	IDPWFSL:
		'Omission is the one tool you allow yourself, and you handle it so carefully that you have half convinced yourself silence is neutral. It is not, and some part of you knows — that is why the excisions are so precise. You are protecting someone. After all these years, it would be worth opening the question of whether that someone still needs it, or ever asked.'
};
