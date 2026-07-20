// Single source of truth for the fonts offered in font-taste and reused when
// styling artistic-claim from that answer. `css` is a ready-to-use font-family
// value; the underlying webfonts are loaded in app.html.
//
// `lora` is THIS QUIZ'S OWN body face, offered deliberately: the taker is
// designing a personality quiz, and one of the fonts on the list is the one
// they are reading the question in. Nothing marks it. See also the matching
// palette in palettes.js, `simple` in buttons.js, and `plain` in
// wallpaper-taste — between them, the exact design of this quiz is a
// reachable answer.
export const FONTS = [
	{ id: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif" },
	{ id: 'playfair', label: 'Playfair Display', css: "'Playfair Display', serif" },
	// iOS does not ship Comic Sans and maps generic `cursive` to a formal script
	// face. Yomogi supplies the intended childlike look on every platform; the
	// sans fallback avoids flashing that iOS script while the webfont loads.
	{
		id: 'comic',
		label: 'Yomogi',
		css: "'Yomogi', 'Comic Sans MS', 'Comic Sans', system-ui, sans-serif"
	},
	// Already loaded in app.html — it is what you are reading right now. Kept
	// well away from Playfair: stacked adjacently, two high-quality serifs read
	// as a rendering bug rather than as two options.
	{ id: 'lora', label: 'Lora', css: "'Lora', Georgia, 'Times New Roman', serif" },
	{ id: 'bitcount', label: 'Bitcount Single', css: "'Bitcount Single', system-ui" },
	{ id: 'plexmono', label: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace" }
];
