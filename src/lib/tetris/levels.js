// Each level is the verbatim opening of one of kimeiga's delta galaxy essays,
// trimmed at a sentence boundary. The piece queue is the passage's characters
// in reading order; letters the kaiski font doesn't draw are skipped. `fallMs` is the gravity interval for the level;
// `music` (optional) loops while the level is being played.
/** @type {{title: string, url: string, fallMs: number, passage: string, music?: string}[]} */
export const levels = [
	{
		title: 'in life there is rain',
		url: 'https://deltastar.substack.com/p/in-life-there-is-rain',
		fallMs: 900,
		music: '/audio/music/the-lurkers.mp3',
		passage:
			'Something I’ve been thinking about a lot lately is how in the early 2000s internet, people just posted what they wanted. They were cringe, stupid, unserious, they overshared, they just let their head-cannons loose. These days the percentage of people on SNS that lurk has skyrocketed (partly why I’m making sehyo.com but I digress).'
	},
	{
		title: 'On the benign unprovability of our perception being reality',
		url: 'https://deltastar.substack.com/p/on-the-benign-unprovability-of-our',
		fallMs: 800,
		music: '/audio/music/a-theory-of-the-bed.mp3',
		passage:
			'Most of my theories I’ve arrived at alone, laying prostrate on my bed. First in high school summers alone in my room in my parent’s home, then on weekends at uni where I didn’t end up going out and I have the triple room to myself, then postgrad in winter work from home days in the city where I hadn’t anything to do. I can feel the unsolved problems in my subconscious, and when a vacancy in the hubbub of life comes around, they rise to the forefront of my psyche and I feel no choice but to work on them, to think them through.'
	},
	{
		title: 'stuck on repeat',
		url: 'https://deltastar.substack.com/p/stuck-on-repeat',
		fallMs: 700,
		music: '/audio/music/sunnyvale-solitude.mp3',
		passage:
			'Life has kind of entered a comfortable lull. I’m aware of my dissatisfaction with the way things are going, but am too scared to leave what I’ve spent so long nurturing. Especially the case with my apartment in Sunnyvale, I’ve luckily received many compliments on how clean we keep it, and the nice amenities; and when I tell my friends the rent, they generally are like “Wow that’s quite good”.'
	}
];
