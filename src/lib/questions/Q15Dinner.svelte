<script>
	// Q15 — "character creation" style dinner builder. Shared $100 budget across
	// 4 courses; each course tiers up in $10 steps to a $50 max. Maxing all four
	// would cost $200, so you can't — the budget forces trade-offs.
	import BudgetBuilder from './BudgetBuilder.svelte';
	let { onAnswer } = $props();

	const prompt =
		'You want to put together the perfect dinner, but you only have $100 to spend. Build your meal — each course gets better the more you spend on it.';

	const categories = [
		{
			id: 'appetizer',
			label: 'Appetizer',
			tiers: {
				0: 'None',
				10: 'A small salad',
				20: 'Fancy salad, homemade sauce',
				30: 'Escargot',
				40: 'Salmon carpaccio',
				50: 'Truffle-infused soufflé'
			}
		},
		{
			id: 'soup',
			label: 'Soup',
			tiers: {
				0: 'None',
				10: 'Chicken soup',
				20: 'Clam chowder',
				30: 'French onion soup',
				40: 'Lobster bisque',
				50: 'Bouillabaisse'
			}
		},
		{
			id: 'entree',
			label: 'Entree',
			tiers: {
				0: 'None',
				10: 'Grilled chicken breast',
				20: 'Salmon / cod fillet',
				30: 'Steak',
				40: 'Filet mignon',
				50: 'Lobster'
			}
		},
		{
			id: 'dessert',
			label: 'Dessert',
			tiers: {
				0: 'None',
				10: 'Chocolate bar',
				20: 'Pudding',
				30: 'Chocolate cake',
				40: 'Matcha tiramisu',
				50: 'Gold-leaf chocolate soufflé'
			}
		}
	];

	/** @param {Record<string, number>} values */
	function toScore(values) {
		return {
			connector: Math.round(values.appetizer / 10),
			sage: Math.round(values.soup / 10),
			maker: Math.round(values.entree / 10),
			adventurer: Math.round(values.dessert / 10)
		};
	}
</script>

<BudgetBuilder {prompt} budget={100} step={10} {categories} {toScore} {onAnswer} />
