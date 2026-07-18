// The apocalypse supply catalog, shared by Q26 (pack the backpack) and
// Q27 (give one packed item away). `cells` are [row, col] offsets from each
// shape's top-left anchor (Tetris-style footprints); `score` is awarded for
// packing the item, `give` for handing it to the wounded survivor. Sprites
// are inline ink line-art SVGs — swap a `svg` string for an <img> to use
// generated art (keep the image's aspect ratio equal to the cell bounding box).

const S = (viewBox, body) =>
	`<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ITEMS = [
	{
		id: 'flashlight',
		name: 'Flashlight',
		cells: [
			[0, 0],
			[0, 1]
		],
		score: { maker: 2 },
		give: { connector: 2 },
		svg: S(
			'0 0 64 32',
			'<rect x="5" y="11" width="28" height="11" rx="3"/><path d="M33 9 L45 4 v25 l-12 -5"/><path d="M50 9 l8 -4 M50 16 h9 M50 23 l8 4"/>'
		)
	},
	{
		id: 'can',
		name: 'Canned food',
		cells: [[0, 0]],
		score: { sage: 1 },
		give: { connector: 2 },
		svg: S(
			'0 0 32 32',
			'<ellipse cx="16" cy="8" rx="10" ry="3.5"/><path d="M6 8 v16 c0 2 4.5 3.5 10 3.5 s10 -1.5 10 -3.5 V8"/><path d="M6 15 c2 1.8 6 2.6 10 2.6 s8 -0.8 10 -2.6"/>'
		)
	},
	{
		id: 'water',
		name: 'Water bottle',
		cells: [
			[0, 0],
			[1, 0]
		],
		score: { sage: 2 },
		give: { connector: 3 },
		svg: S(
			'0 0 32 64',
			'<rect x="12" y="4" width="8" height="5" rx="1.5"/><path d="M11 12 h10 l3 9 v33 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4 V21 z"/><path d="M9 32 h14 M9 42 h14"/>'
		)
	},
	{
		id: 'crowbar',
		name: 'Crowbar',
		cells: [
			[0, 0],
			[1, 0],
			[1, 1]
		],
		score: { adventurer: 2 },
		give: { connector: 1, adventurer: 1 },
		svg: S('0 0 64 64', '<path d="M22 6 a10 10 0 1 0 -12 12 l4 -1 34 38 a5 5 0 0 0 8 -6 L20 12 z"/>')
	},
	{
		id: 'shovel',
		name: 'Shovel',
		cells: [
			[0, 0],
			[1, 0],
			[2, 0]
		],
		score: { maker: 2 },
		give: { connector: 1, maker: 1 },
		svg: S(
			'0 0 32 96',
			'<path d="M10 6 h12 M16 6 v44"/><path d="M8 50 h16 v16 c0 9 -4 16 -8 21 c-4 -5 -8 -12 -8 -21 z"/>'
		)
	},
	{
		id: 'rope',
		name: 'Rope',
		cells: [
			[0, 0],
			[0, 1]
		],
		score: { adventurer: 1, maker: 1 },
		give: { connector: 1, maker: 1 },
		svg: S(
			'0 0 64 32',
			'<ellipse cx="20" cy="16" rx="13" ry="9"/><ellipse cx="32" cy="16" rx="13" ry="9"/><path d="M45 12 c7 1 11 3 13 6"/>'
		)
	},
	{
		id: 'gameboy',
		name: 'Game Boy',
		cells: [[0, 0]],
		score: { connector: 2 },
		give: { connector: 2 },
		svg: S(
			'0 0 32 32',
			'<rect x="6" y="3" width="20" height="26" rx="3"/><rect x="9.5" y="6" width="13" height="9"/><path d="M11 22 h6 M14 19 v6"/><circle cx="23" cy="20.5" r="1.5"/><circle cx="20" cy="24" r="1.5"/>'
		)
	},
	{
		id: 'starlink',
		name: 'Starlink terminal',
		cells: [
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1]
		],
		score: { connector: 2, sage: 1 },
		give: { connector: 3 },
		svg: S(
			'0 0 64 64',
			'<rect x="14" y="5" width="36" height="24" rx="4" transform="rotate(-10 32 17)"/><path d="M32 31 v9 M23 40 h18"/><rect x="18" y="48" width="28" height="9" rx="2.5"/>'
		)
	}
];
