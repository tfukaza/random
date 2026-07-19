<script lang="ts">
	import { Engine } from '@snap-engine/asset-base-svelte';
	import type { ItemMoveEvent } from '@snap-engine/snapsort';
	import { Container, Handle, Item } from '@snap-engine/snapsort-svelte';

	type Task = { id: string; label: string };

	let tasks: Task[] = $state([
		{ id: 'research', label: 'Research the problem' },
		{ id: 'prototype', label: 'Build a prototype' },
		{ id: 'validate', label: 'Validate the interaction' },
		{ id: 'ship', label: 'Ship the result' }
	]);

	function onItemMove(event: ItemMoveEvent) {
		const itemId = String(event.itemId);
		const task = tasks.find((entry) => entry.id === itemId);
		if (!task) return;

		const next = tasks.filter((entry) => entry.id !== itemId);
		next.splice(event.to.index, 0, task);
		tasks = next;
	}
</script>

<svelte:head>
	<title>SnapSort clean-room simulation</title>
</svelte:head>

<main>
	<section class="demo-card">
		<p class="eyebrow">Published-package simulation</p>
		<h1>Prioritize the launch</h1>
		<p class="instructions">Drag any row by its handle. The numbered order below is application state.</p>

		<Engine id="snapsort-clean-room">
			<Container
				className="task-list"
				items={tasks}
				getItemId={(task) => task.id}
				config={{
					direction: 'column',
					groupID: 'launch-tasks',
					callbacks: { onItemMove }
				}}
			>
				{#snippet entry(task)}
					<Item itemId={task.id} className="task-row">
						<Handle className="drag-handle">⋮⋮</Handle>
						<span>{task.label}</span>
					</Item>
				{/snippet}
			</Container>
		</Engine>

		<ol data-testid="state-order">
			{#each tasks as task (task.id)}
				<li>{task.label}</li>
			{/each}
		</ol>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f3f5f8;
		color: #172033;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
	}

	main {
		display: grid;
		min-height: 100vh;
		place-items: center;
		padding: 2rem;
	}

	.demo-card {
		width: min(34rem, 100%);
		padding: 2rem;
		border: 1px solid #dce1ea;
		border-radius: 1.25rem;
		background: white;
		box-shadow: 0 1rem 3rem rgb(23 32 51 / 10%);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		color: #6558d3;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 5vw, 2.6rem);
	}

	.instructions {
		margin: 0.7rem 0 1.5rem;
		color: #687086;
	}

	:global(.task-list) {
		gap: 0.65rem;
	}

	:global(.task-row) {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.9rem 1rem;
		border: 1px solid #dce1ea;
		border-radius: 0.8rem;
		background: #fff;
		box-shadow: 0 0.2rem 0.7rem rgb(23 32 51 / 6%);
	}

	:global(.drag-handle) {
		cursor: grab;
		color: #6558d3;
		font-weight: 900;
		letter-spacing: -0.2em;
		user-select: none;
		touch-action: none;
	}

	ol {
		margin: 1.5rem 0 0;
		padding: 1rem 1rem 1rem 2.4rem;
		border-radius: 0.8rem;
		background: #f7f8fb;
		color: #687086;
		font-size: 0.9rem;
	}
</style>
