<script>
	// Q44 — the optimist/pessimist cliché, answered by people who refuse to
	// engage with the metaphor and reach for a unit conversion instead. Every
	// option describes the same 16 fl oz of water; none of them tells you
	// anything about the person's outlook, which is the joke.
	//
	// The numbers are real — the comedy is deadpan accuracy, so they're worth
	// keeping correct. Working, for 16 fl oz = 473.18 mL = 473.18 g of water:
	//
	//   Sweat    A sedentary adult sweats a minimum of ~0.5 L/day (plus ~400–450
	//            mL/day of insensible cutaneous loss), so 473 mL is on the order
	//            of a single day — NOT years. During exercise (0.5–2 L/hour)
	//            it's more like 15–30 minutes.
	//   Pool     Olympic pool = 50 × 25 × 2 m = 2,500 m³ = 2.5e6 L.
	//            0.47318 / 2.5e6 = 1.89e-7 → one 5,280,000th. A billionth of a
	//            pool would be 2.5 mL, about half a teaspoon.
	//   Molecules 473.18 g ÷ 18.015 g/mol = 26.27 mol
	//            26.27 × 6.02214e23 = 1.58e25 molecules.
	//            (Atoms would be 3× that, ~4.7e25 — this option says molecules.)
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const prompt = 'Instead of “the glass is half empty,” you would rather say…';
	const options = [
		{ label: '“16 oz.”', score: { scope: -2, creative: -1 } },
		{
			label: '“About as much as the average adult sweats in a day.”',
			score: { creative: 1, risk: 1 }
		},
		{
			label: '“One five-millionth of an Olympic swimming pool.”',
			score: { scope: 2, creative: 1 }
		},
		{
			label: '“Roughly 1.6 × 10²⁵ water molecules.”',
			score: { scope: -3, creative: 1 }
		}
	];
</script>

<PickList {prompt} {options} {onAnswer} />
