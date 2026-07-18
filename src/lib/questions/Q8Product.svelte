<script>
	// Q8 — tail end of the "normal" band. Believable scenario; the line-cutting
	// option is the first small wink toward the mischief to come. Reframed as a
	// meet-and-greet so what's at stake is meeting someone you admire, not
	// acquiring an object — the options read very differently that way.
	import PickList from './PickList.svelte';
	let { onAnswer } = $props();

	const premise =
		'An artist you have looked up to for years is doing a meet-and-greet — one afternoon only, no second date. You get there and the line is already out the door and around the block. Hours, easily, and no guarantee they get to everyone.';
	const prompt = 'What do you do?';
	const options = [
		{ label: 'Head home — it was never going to be worth hours', score: { sage: 3 } },
		{ label: 'Get in line. You have waited years, you can wait an afternoon', score: { adventurer: 3 } },
		{
			label: 'Skip the line and find another way to reach them — email, socials, the back door',
			score: { maker: 3 }
		},
		{ label: 'Start talking to the people in line and make an afternoon of it', score: { connector: 3 } }
	];
</script>

<PickList {premise} {prompt} {options} {onAnswer} />
