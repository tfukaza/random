// Shared, reactive record of the raw design choices a taker made in Q16/Q17/Q18,
// so a later question (Q19) can restyle itself from them. This is deliberately
// separate from the score tally — it captures *what was picked*, not points.
export const choices = $state({
	/** @type {{ id: string, label: string, css: string } | null} */
	font: null,
	/** @type {{ id: string, label: string, colors: string[], roles: { bg: string, text: string, accent: string } } | null} */
	palette: null,
	/** @type {string | null} */
	button: null,
	/** @type {string | null} */
	wallpaper: null
});
