<script>
	import { PROP_SPRITES } from './sceneSprites.js';

	let { id, label = '' } = $props();
</script>

<span class="scene-prop scene-prop-{id}">
	<img src={PROP_SPRITES[id]} alt={label} draggable="false" />
</span>

<style>
	.scene-prop {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
		-webkit-user-select: none;
		user-select: none;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
