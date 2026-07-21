<script>
	// A small line-drawn seedling: the PLACEHOLDER emblem for the front cover.
	// Used at two sizes — tiny in the title-page divider (where the ❦ fleuron
	// used to sit) and larger inside the engraving plate — until the real
	// cover art is generated and dropped in. Strokes in currentColor so it
	// inherits the letterpress ink like every other line drawing.
	//
	// A seedling, deliberately: the instrument's initials are the one joke the
	// site never prints, and this is as close as the cover comes to saying it.
	let { size = 18 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- stem -->
	<path d="M16 28 V14" />
	<!-- left leaf -->
	<path d="M16 18 C11 18 8 15 7.5 10.5 C12 11 15.5 13.5 16 18 Z" />
	<!-- right leaf -->
	<path d="M16 14 C21 14 24 11 24.5 6.5 C20 7 16.5 9.5 16 14 Z" />
	<!-- soil line -->
	<path d="M9 28 H23" />
</svg>
