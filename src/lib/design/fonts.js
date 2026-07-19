// Single source of truth for the fonts offered in Q16 and reused when styling
// Q19 based on the Q16 answer. `css` is a ready-to-use font-family value; the
// underlying webfonts are loaded in app.html.
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
	{ id: 'bitcount', label: 'Bitcount Single', css: "'Bitcount Single', system-ui" },
	{ id: 'plexmono', label: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace" }
];
