<script>
	// pointer-heatmap — turns the taker's own otherwise invisible input trail into
	// the picture. The snapshot happens before this question can add to it, so the
	// answer controls do not redraw the evidence they are asking about.
	import { onMount } from 'svelte';
	import PickList from './PickList.svelte';
	import { snapshotPointerHeatmap } from './pointerHeatmap.js';

	let { onAnswer } = $props();
	/** @type {HTMLCanvasElement} */
	let canvas;
	const points = snapshotPointerHeatmap();

	const prompt = 'What do you see in this picture?';
	// The correct option is worded as tersely as the decoys ON PURPOSE. An
	// earlier draft spelled out "…of where I've been clicking and moving my
	// mouse", and an option that much longer and more specific than its
	// neighbours reads as the answer key. "A heat map" gives the observant
	// taker exactly one quiet foothold and no more.
	const options = [
		{ label: 'A heat map', score: { scope: -3, honesty: 1 } },
		{ label: 'A cat inside a house', score: { creative: 2 } },
		{ label: 'A storm system moving over the ocean', score: { creative: 1, risk: 1 } },
		{ label: 'A moth with one wing folded', score: { creative: 1, scope: 1 } },
		{ label: 'Nothing I can name', score: { scope: 2 } }
	];

	/** @param {CanvasRenderingContext2D} context @param {number} x @param {number} y @param {number} radius @param {string} color */
	function spot(context, x, y, radius, color) {
		const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
		gradient.addColorStop(0, color);
		gradient.addColorStop(1, 'rgba(255,255,255,0)');
		context.fillStyle = gradient;
		context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
	}

	onMount(() => {
		const context = canvas.getContext('2d');
		if (!context) return;
		const { width, height } = canvas;
		context.fillStyle = '#f7f3ea';
		context.fillRect(0, 0, width, height);
		context.globalCompositeOperation = 'multiply';
		for (const point of points) {
			const x = point.x * width;
			const y = point.y * height;
			if (point.kind === 'press') {
				spot(context, x, y, point.pointerType === 'touch' ? 66 : 50, 'rgba(167,65,45,0.34)');
			} else {
				spot(context, x, y, 30, 'rgba(48,91,104,0.09)');
			}
		}
		context.globalCompositeOperation = 'source-over';
		context.strokeStyle = '#c3c3c1';
		context.lineWidth = 2;
		context.strokeRect(1, 1, width - 2, height - 2);
	});
</script>

<PickList {prompt} {options} {onAnswer}>
	<div
		class="picture"
		data-point-count={points.length}
		role="img"
		aria-label="An abstract field of soft overlapping blue and red marks"
	>
		<canvas
			bind:this={canvas}
			width="960"
			height="540"
			aria-hidden="true"
		></canvas>
	</div>
</PickList>

<style>
	.picture {
		margin: 0 0 1.75rem;
		padding: 0.45rem;
		border: 1px solid var(--border);
		background: var(--surface);
		animation: rise 0.5s both;
	}
	canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
	}
</style>
