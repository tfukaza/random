<script>
	import { audio, audioState } from './audio.svelte.js';

	const needsRestore = $derived(
		audioState.enabled &&
			audioState.started &&
			(['locked', 'interrupted', 'recoverable'].includes(audioState.status) ||
				(audioState.status === 'error' && audioState.errorCategory === 'context-recovery'))
	);
	const needsRetry = $derived(
		audioState.enabled &&
			audioState.started &&
			audioState.status === 'error' &&
			audioState.errorCategory !== 'context-recovery'
	);
	const needsAction = $derived(needsRestore || needsRetry);
	const label = $derived(
		needsRestore
			? 'Restore sound'
			: needsRetry
				? 'Retry sound'
				: audioState.enabled
					? 'Sound on'
					: 'Sound off'
	);
	const accessibleLabel = $derived(
		needsRestore
			? 'Tap to restore quiz sound'
			: needsRetry
				? 'Retry unavailable quiz sound'
			: audioState.enabled
				? 'Mute quiz sound'
				: 'Turn on quiz sound'
	);
	let gestureWasRestore = false;

	function rememberPointerAction() {
		gestureWasRestore = needsAction;
	}

	/** @param {KeyboardEvent} event */
	function rememberKeyboardAction(event) {
		if (event.key === 'Enter' || event.key === ' ') gestureWasRestore = needsAction;
	}

	function toggle() {
		const restoring = gestureWasRestore || needsAction;
		gestureWasRestore = false;
		if (restoring) {
			void audio.recoverFromGesture().then((outcome) => {
				if (outcome === 'playing' || outcome === 'silent') audio.sfx.play('ui-toggle');
			});
			return;
		}
		const enabled = !audioState.enabled;
		audio.setEnabled(enabled);
		if (enabled) {
			void audio.activateFromGesture();
			audio.sfx.play('ui-toggle');
		}
	}
</script>

<button
	class="sound-control"
	class:needs-restore={needsAction}
	type="button"
	data-sfx="none"
	aria-pressed={audioState.enabled}
	aria-label={accessibleLabel}
	title={label}
	onpointerdown={rememberPointerAction}
	onkeydown={rememberKeyboardAction}
	onclick={toggle}
>
	<span class="icon" class:muted={!audioState.enabled} aria-hidden="true">♪</span>
	<span>{label}</span>
</button>

<style>
	.sound-control {
		position: fixed;
		top: max(0.75rem, env(safe-area-inset-top));
		right: max(0.75rem, env(safe-area-inset-right));
		z-index: 90;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.38rem 0.58rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		font: inherit;
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}
	.sound-control:hover,
	.sound-control:focus-visible,
	.sound-control.needs-restore {
		color: var(--ink);
		border-color: var(--ink);
	}
	.sound-control.needs-restore {
		box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--ink);
	}
	.icon {
		position: relative;
		line-height: 1;
	}
	.icon.muted::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 1rem;
		height: 1px;
		background: currentColor;
		transform: translate(-50%, -50%) rotate(-45deg);
	}
	@media (max-width: 560px) {
		.sound-control span:last-child {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		.sound-control {
			width: 2.2rem;
			height: 2.2rem;
			justify-content: center;
			padding: 0;
			font-size: 0.82rem;
		}
	}
</style>
