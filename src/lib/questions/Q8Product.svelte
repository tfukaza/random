<script>
	// Q8 — tail end of the "normal" band. Believable scenario; simply cutting the
	// line is the first small wink toward the mischief to come. Reframed as a
	// meet-and-greet so what's at stake is meeting someone you admire, not
	// acquiring an object — the options read very differently that way.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		'An artist you have looked up to for years is doing a meet-and-greet — one afternoon only, no second date. You get there and the line is already out the door and around the block. Hours, easily, and no guarantee they get to everyone.';
	const prompt = 'What do you do?';
	const options = [
		{ label: 'Head home — it was never going to be worth hours', score: { risk: -2 } },
		{
			label: 'Get in line. You have waited years, you can wait an afternoon',
			score: { tempo: -3, risk: -1 }
		},
		{
			label: 'Cut the line. Walk up like you belong there',
			score: { risk: 3, honesty: -2, tempo: 2, coord: -1 }
		},
		{
			label: 'Skip the line and find another way to reach them — email, socials, the back door',
			score: { creative: 2, risk: 2, coord: -1 }
		},
		{
			label: 'Start talking to the people in line and make an afternoon of it',
			score: { social: 3, tempo: -1, coord: 1 }
		}
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
