// Single source of truth for the fonts offered in Q16 and reused when styling
// Q19 based on the Q16 answer. `css` is a ready-to-use font-family value; the
// underlying webfonts are loaded in app.html.
export const FONTS = [
	{ id: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif" },
	{ id: 'playfair', label: 'Playfair Display', css: "'Playfair Display', serif" },
	{ id: 'comic', label: 'Comic Sans', css: "'Comic Sans MS', 'Comic Sans', cursive" },
	{ id: 'bitcount', label: 'Bitcount Single', css: "'Bitcount Single', system-ui" },
	{ id: 'plexmono', label: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace" }
];
