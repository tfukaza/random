<script>
	import { audioState, playSfx, resumeAudio, startAudio, suspendAudio } from './audio.svelte.js';

	let { active = false } = $props();

	const rangeTimes = new WeakMap();
	const rangeValues = new WeakMap();

	function unlock() {
		if (active && audioState.enabled && !audioState.started) startAudio();
	}

	/** @param {MouseEvent} event */
	function click(event) {
		const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
		const button = /** @type {HTMLButtonElement | null} */ (target?.closest('button'));
		if (!button || button.disabled) return;
		const requested = button.dataset.sfx;
		if (requested === 'none') return;
		const action = button.matches('.next, .submit, .continue, .start, .leave, .ink-button')
			? 'ui-confirm'
			: 'ui-tap';
		void playSfx(/** @type {any} */ (requested || action));
	}

	/** @param {Event} event */
	function change(event) {
		const input = /** @type {HTMLInputElement | null} */ (
			event.target instanceof HTMLInputElement ? event.target : null
		);
		if (input && (input.type === 'checkbox' || input.type === 'radio')) void playSfx('ui-toggle');
	}

	/** @param {Event} event */
	function input(event) {
		const slider = /** @type {HTMLInputElement | null} */ (
			event.target instanceof HTMLInputElement && event.target.type === 'range' ? event.target : null
		);
		if (!slider) return;
		const now = performance.now();
		if (rangeValues.get(slider) === slider.value || now - (rangeTimes.get(slider) ?? 0) < 55) return;
		rangeValues.set(slider, slider.value);
		rangeTimes.set(slider, now);
		void playSfx('slider-detent', { rate: 0.9 + Number(slider.valueAsNumber % 5) * 0.025 });
	}

	function visibility() {
		document.hidden ? suspendAudio() : resumeAudio();
	}
</script>

<!-- Choice and submit handlers commonly disable themselves immediately.
     Capture the click before that state change so the sound is not discarded
     as though the user had clicked an already-disabled control. -->
<svelte:window
	onpointerdowncapture={unlock}
	onkeydowncapture={unlock}
	onclickcapture={click}
	onchange={change}
	oninput={input}
/>
<svelte:document onvisibilitychange={visibility} />
