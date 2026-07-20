<script>
	// perfect-dinner — "character creation" style dinner builder. One $100 budget
	// across a venue and four courses, in $10 steps.
	//
	// Every line tiers all the way to $100, so blowing the entire budget on a
	// single item is a legal — and pointedly stupid — answer: a chartered yacht
	// and nothing whatsoever to eat on it. That is the question. The old $50
	// ceiling quietly forced everyone into a balanced meal and threw away the
	// most revealing answers, because the only choice left was which two courses
	// to favour.
	//
	// Venue leads the list because it sets the scene the food arrives into, and
	// because $0 is a real answer there rather than an absence: you host. Every
	// other line's $0 is "None".
	//
	// The tiers are the joke. Each line escalates from a thing you would actually
	// do into something no one should, and the top rung is always absurd rather
	// than merely expensive.
	import BudgetBuilder from './BudgetBuilder.svelte';
	let { onAnswer } = $props();

	const prompt =
		'You want to put together the perfect dinner, and you have $100 for it. Build the evening — each line gets better the more you spend. Whatever you do not spend, you keep.';

	const categories = [
		{
			id: 'venue',
			label: 'Venue',
			tiers: {
				0: 'Host at your home',
				10: 'A picnic at the local park',
				20: 'A picnic at the good park, a drive away',
				30: 'A reserved picnic shelter, permit and all',
				40: 'Rent a campsite',
				50: 'Book a venue',
				60: 'Book a fancy venue',
				70: 'Rent out a restaurant',
				80: 'A luxury villa rental',
				90: 'A castle. The off-season rate',
				100: 'Charter a yacht'
			}
		},
		{
			id: 'appetizer',
			label: 'Appetizer',
			tiers: {
				0: 'None',
				10: 'A side salad',
				20: 'Garlic bread, warmed',
				30: 'Fancy salad, homemade dressing',
				40: 'Burrata with heirloom tomato',
				50: 'Escargot',
				60: 'Salmon carpaccio',
				70: 'Oysters, half a dozen',
				80: 'Truffle-infused soufflé',
				90: 'Caviar service, one spoon',
				100: 'Caviar service, no longer reasonable'
			}
		},
		{
			id: 'soup',
			label: 'Soup',
			tiers: {
				0: 'None',
				10: 'Instant miso',
				20: 'Chicken noodle',
				30: 'Clam chowder',
				40: 'French onion, properly gratinéed',
				50: 'Tom yum with river prawns',
				60: 'Lobster bisque',
				70: 'Bouillabaisse',
				80: 'Consommé, clarified three times',
				90: 'Bird’s nest soup',
				100: 'A soup that took four days'
			}
		},
		{
			id: 'entree',
			label: 'Entree',
			tiers: {
				0: 'None',
				10: 'Grilled chicken breast',
				20: 'Cod fillet',
				30: 'Salmon, skin crisped',
				40: 'Duck confit',
				50: 'Ribeye',
				60: 'Filet mignon',
				70: 'Lobster',
				80: 'Wagyu, a modest cut',
				90: 'Wagyu, an immodest cut',
				100: 'A5 wagyu, and the chef watches you eat it'
			}
		},
		{
			id: 'dessert',
			label: 'Dessert',
			tiers: {
				0: 'None',
				10: 'A chocolate bar from the counter',
				20: 'Pudding',
				30: 'Crème brûlée',
				40: 'Chocolate cake',
				50: 'Matcha tiramisu',
				60: 'Soufflé',
				70: 'Gold-leaf chocolate soufflé',
				80: 'A croquembouche, for one',
				90: 'Something flown in this morning',
				100: 'A dessert named after you'
			}
		}
	];

	/** @param {Record<string, number>} values */
	function toScore(values) {
		/** @type {Record<string, number>} */
		const delta = {};
		// Axis scoring reads the SHAPE of the allocation, not the courses:
		// going all-in, spreading evenly, splurging on dessert, or walking away
		// with the cash each say something different.
		const spent = Object.values(values).reduce((a, b) => a + b, 0);
		// The balance check is about the MEAL, so it reads the four courses only —
		// a huge venue shouldn't disqualify an otherwise even spread. `biggest`
		// does include the venue, because chartering a yacht and eating nothing
		// is the most all-in answer available.
		const courses = [values.appetizer, values.soup, values.entree, values.dessert];
		const biggest = Math.max(...courses, values.venue);
		/** @param {string} axis @param {number} pts */
		const add = (axis, pts) => (delta[axis] = Math.max(-3, Math.min(3, (delta[axis] ?? 0) + pts)));

		// Thresholds scale with the ceiling: $50 used to BE all-in, and now it is
		// merely half. Everything on one line is the strongest signal the question
		// can produce, so it scores hardest.
		if (biggest >= 100) {
			add('risk', 3);
			add('scope', 2);
			add('creative', 1);
		} else if (biggest >= 70) {
			add('risk', 2);
			add('scope', 1);
		}
		if (courses.every((c) => c >= 20)) {
			add('scope', -2);
			add('risk', -1);
		}
		if (values.dessert >= 60) add('creative', 2);
		// Venue is a statement about who else is meant to see this. Hosting is
		// the intimate, self-reliant end; renting somewhere is the opposite.
		if (values.venue === 0) {
			add('coord', 1);
			add('risk', -1);
		} else if (values.venue >= 70) {
			add('social', 2);
			add('risk', 1);
		}
		// Unspent money is POCKETED, so under-spending is a deliberate trade —
		// an evening bought against cash in hand — not a failure of nerve. It is
		// graded rather than a single threshold, because now the amount kept is
		// itself the statement: eating at home with the full $100 still in your
		// pocket is a very different answer from skimming $20 off the top.
		const kept = 100 - spent;
		if (kept >= 70) {
			add('creative', -3);
			add('risk', -3);
			add('social', -2);
		} else if (kept >= 40) {
			add('creative', -2);
			add('risk', -2);
			add('social', -1);
		} else if (kept >= 20) {
			add('creative', -1);
			add('risk', -1);
		} else if (kept === 0) {
			// Nothing held back at all.
			add('risk', 1);
			add('creative', 1);
		}
		return delta;
	}
</script>

<BudgetBuilder
	{prompt}
	budget={100}
	step={10}
	{categories}
	remainderNote="yours to keep"
	{toScore}
	{onAnswer}
/>
