<script>
	import { audio, audioState } from './audio.svelte.js';

	let { active = false } = $props();

	const rangeTimes = new WeakMap();
	const rangeValues = new WeakMap();

	/** @param {PointerEvent | KeyboardEvent} event */
	function unlock(event) {
		if (!active || !audioState.enabled) return;
		// Once the graph is running, ordinary quiz gestures must not push the
		// coordinator back through `loading`. Timed scenes treat that state as a
		// real interruption, so an unconditional unlock would pause every drag,
		// key press and elevator-button tap.
		if (audioState.started && audioState.status !== 'locked') return;
		if (
			['interrupted', 'recoverable'].includes(audioState.status) ||
			(audioState.status === 'error' && audioState.errorCategory === 'context-recovery')
		)
			return;
		const target = event.target instanceof Element ? event.target : null;
		// The restore control owns graph reconstruction. Resuming during its
		// pointerdown can change the button into "Mute" before the ensuing click.
		if (target?.closest('.sound-control.needs-restore')) return;
		void audio.activateFromGesture();
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
		audio.sfx.play(/** @type {any} */ (requested || action));
	}

	/** @param {Event} event */
	function change(event) {
		const input = /** @type {HTMLInputElement | null} */ (
			event.target instanceof HTMLInputElement ? event.target : null
		);
		if (input && (input.type === 'checkbox' || input.type === 'radio')) audio.sfx.play('ui-toggle');
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
		audio.sfx.play('slider-detent', {
			rate: 0.9 + Number(slider.valueAsNumber % 5) * 0.025
		});
	}

	function visibility() {
		document.hidden ? audio.suspend() : audio.resume();
	}

	function pagehide() {
		audio.suspend();
	}

	function pageshow() {
		if (!document.hidden) audio.resume();
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
	onpagehide={pagehide}
	onpageshow={pageshow}
/>
<svelte:document onvisibilitychange={visibility} />
