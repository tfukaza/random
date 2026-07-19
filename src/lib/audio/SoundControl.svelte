<script>
	import { audioState, playSfx, setAudioEnabled } from './audio.svelte.js';

	function toggle() {
		const enabled = !audioState.enabled;
		setAudioEnabled(enabled);
		if (enabled) void playSfx('ui-toggle');
	}
</script>

<button
	class="sound-control"
	type="button"
	data-sfx="none"
	aria-pressed={audioState.enabled}
	aria-label={audioState.enabled ? 'Mute quiz sound' : 'Turn on quiz sound'}
	title={audioState.enabled ? 'Sound on' : 'Sound off'}
	onclick={toggle}
>
	<span class="icon" class:muted={!audioState.enabled} aria-hidden="true">♪</span>
	<span>{audioState.enabled ? 'Sound on' : 'Sound off'}</span>
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
	.sound-control:focus-visible {
		color: var(--ink);
		border-color: var(--ink);
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
