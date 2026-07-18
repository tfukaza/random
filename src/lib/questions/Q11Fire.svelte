<script>
	// Q11 — opens the embezzler arc (see docs/lore.md, arc 2): you took tens of
	// millions from your own company, they hired someone to find you, and they
	// just did. Same one-thing-only scarcity mechanic as the old apartment-fire
	// version, but every option is now a defensible plan.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		'You took tens of millions from the company you ran. The company did not call the police — it hired someone. Tonight, headlights swing into the driveway of the house nobody was supposed to know about.';
	const prompt = 'You have about thirty seconds and one free hand. What do you take?';
	const options = [
		{
			label: 'The duffel of cash — untraceable, and it is the entire point',
			score: { maker: 3 }
		},
		{
			label: 'The passports and the keys to a car in another name',
			score: { sage: 3 }
		},
		{
			label: 'The files proving you were not the only one stealing',
			score: { adventurer: 3 }
		},
		{
			label: 'The photo of the people you can never contact again',
			score: { connector: 3 }
		}
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
