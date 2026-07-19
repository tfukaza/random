<script>
	import { onMount } from 'svelte';
	import {
		DAMAGE_RADIUS_RADIANS,
		IMPACT_DIRECTION,
		TARGETS,
		damageAt,
		displayPercentages,
		scoreImpact
	} from './q50PlanetModel.js';
	import {
		audioState,
		clearMusicDuck,
		duckMusic,
		playSfx,
		setMusicTrack,
		stopSfx
	} from '$lib/audio/audio.svelte.js';
	const COUNTDOWN_MS = 30000;
	const DEBUG_DISPLAY_SECONDS = 9999;

	let { onAnswer } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	/** @type {HTMLDivElement | undefined} */
	let viewport = $state();
	let phase = $state('loading');
	let remaining = $state(COUNTDOWN_MS / 1000);
	let debugInfinite = $state(false);
	let damage = $state(displayPercentages(damageAt(IMPACT_DIRECTION)));
	let failure = $state('');
	let whiteout = $state(false);
	let whiteoutLeft = $state(0);
	let whiteoutTop = $state(0);
	let whiteoutWidth = $state(0);
	let whiteoutHeight = $state(0);
	let whiteoutX = $state(0);
	let whiteoutY = $state(0);

	let sortedDamage = $derived([...damage].sort((a, b) => b.share - a.share));
	let affectedDamage = $derived(sortedDamage.filter((item) => item.percent > 0));
	let damageSlots = $derived(
		Array.from({ length: 3 }, (_, index) => affectedDamage[index] ?? null)
	);

	/** @type {(autoLocked: boolean) => void} */
	let commitOrientation = () => {};
	/** @type {(axis: 'x' | 'y', angle: number) => void} */
	let rotatePlanet = () => {};
	/** @type {(enabled: boolean) => void} */
	let setDebugMode = () => {};
	let answerSent = false;
	/** Assigned once the Three.js runtime is ready; used to retry timer startup
	 * when the asynchronously loaded asteroid score actually begins playing. */
	let tryBeginTimer = () => {};

	$effect(() => {
		if (!audioState.enabled || audioState.musicTrack === 'asteroid' || audioState.musicFailed)
			tryBeginTimer();
	});

	/** @param {Event} event */
	function changeDebugMode(event) {
		setDebugMode(/** @type {HTMLInputElement} */ (event.currentTarget).checked);
	}

	/** @param {KeyboardEvent} event */
	function handleKey(event) {
		if (phase !== 'active') return;
		const amount = ((event.shiftKey ? 15 : 5) * Math.PI) / 180;
		if (event.key === 'ArrowLeft') rotatePlanet('y', -amount);
		else if (event.key === 'ArrowRight') rotatePlanet('y', amount);
		else if (event.key === 'ArrowUp') rotatePlanet('x', -amount);
		else if (event.key === 'ArrowDown') rotatePlanet('x', amount);
		else if (event.key.toLowerCase() === 'r') rotatePlanet('y', 0);
		else return;
		event.preventDefault();
		void playSfx('slider-detent', { rate: event.key.toLowerCase() === 'r' ? 0.8 : 1 });
	}

	function continueWithoutAnswer() {
		if (answerSent) return;
		answerSent = true;
		onAnswer({});
	}

	onMount(() => {
		void setMusicTrack('asteroid', { restart: true });
		let disposed = false;
		let cleanupRuntime = () => {};

		async function setup() {
			const THREE = await import('three');
			const { CSS2DObject, CSS2DRenderer } = await import(
				'three/addons/renderers/CSS2DRenderer.js'
			);
			if (disposed || !canvas || !viewport) return;
			const canvasElement = canvas;
			const viewportElement = viewport;

			const css = getComputedStyle(document.documentElement);
			const ink = css.getPropertyValue('--ink').trim() || '#222220';
			const surface = css.getPropertyValue('--surface').trim() || '#fcfcfb';
			const border = css.getPropertyValue('--border').trim() || '#e5e5e3';
			const muted = css.getPropertyValue('--muted').trim() || '#797977';
			const accent = css.getPropertyValue('--accent-soft').trim() || '#f0f0ee';

			const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: false });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			renderer.setClearColor(surface, 1);
			renderer.outputColorSpace = THREE.SRGBColorSpace;

			const labelRenderer = new CSS2DRenderer();
			labelRenderer.domElement.className = 'q50-label-layer';
			labelRenderer.domElement.setAttribute('aria-hidden', 'true');
			viewportElement.append(labelRenderer.domElement);

			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
			camera.position.set(0, 0.7, 9.5);
			camera.lookAt(0, 0.7, 0);

			const planetGroup = new THREE.Group();
			scene.add(planetGroup);
			const planetRadius = 2.2;

			const sourceGeometry = new THREE.IcosahedronGeometry(planetRadius, 4);
			const planetGeometry = sourceGeometry.index
				? sourceGeometry.toNonIndexed()
				: sourceGeometry;
			if (planetGeometry !== sourceGeometry) sourceGeometry.dispose();

			const positions = /** @type {import('three').BufferAttribute} */ (
				planetGeometry.getAttribute('position')
			);
			/** @type {Array<{ index: number, normal: any, score: number, area: number }>} */
			const faces = [];
			for (let i = 0; i < positions.count; i += 3) {
				const a = new THREE.Vector3().fromBufferAttribute(positions, i);
				const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
				const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
				const normal = a.clone().add(b).add(c).normalize();
				const area = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
				const score =
					Math.sin(normal.x * 4.3 + normal.z * 1.7) * 0.55 +
					Math.sin(normal.y * 6.1 - normal.x * 2.2) * 0.3 +
					Math.cos((normal.x + normal.y - normal.z) * 8.7) * 0.15;
				faces.push({ index: i / 3, normal, score, area });
			}

			const land = Array(faces.length).fill(false);
			const totalArea = faces.reduce((sum, face) => sum + face.area, 0);
			let landArea = 0;
			for (const face of [...faces].sort((a, b) => b.score - a.score)) {
				if (landArea >= totalArea * 0.7) break;
				land[face.index] = true;
				landArea += face.area;
			}

			const targetFaces = TARGETS.map((target) => {
				const normal = new THREE.Vector3(...target.normal);
				return faces.reduce((best, face) =>
					face.normal.dot(normal) > best.normal.dot(normal) ? face : best
				);
			});
			const anchored = new Set(targetFaces.map((face) => face.index));
			TARGETS.forEach((target, targetIndex) => {
				const face = targetFaces[targetIndex];
				const desired = target.surface === 'land';
				if (land[face.index] === desired) return;
				const swap = faces
					.filter((candidate) => !anchored.has(candidate.index) && land[candidate.index] === desired)
					.sort((a, b) => Math.abs(a.score - face.score) - Math.abs(b.score - face.score))[0];
				land[face.index] = desired;
				if (swap) land[swap.index] = !desired;
			});

			const landA = new THREE.Color(surface);
			const landB = new THREE.Color(accent);
			const waterA = new THREE.Color(muted);
			const waterB = new THREE.Color(border);
			const colors = new Float32Array(positions.count * 3);
			for (const face of faces) {
				const variation = (Math.sin(face.index * 91.17) + 1) * 0.18;
				const color = land[face.index]
					? landA.clone().lerp(landB, variation)
					: waterA.clone().lerp(waterB, variation);
				for (let vertex = 0; vertex < 3; vertex += 1) {
					const offset = (face.index * 3 + vertex) * 3;
					colors[offset] = color.r;
					colors[offset + 1] = color.g;
					colors[offset + 2] = color.b;
				}
			}
			planetGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
			const planetMaterial = new THREE.MeshStandardMaterial({
				vertexColors: true,
				flatShading: true,
				roughness: 1,
				metalness: 0
			});
			const planet = new THREE.Mesh(planetGeometry, planetMaterial);
			planetGroup.add(planet);

			scene.add(new THREE.HemisphereLight(surface, ink, 2.1));
			const keyLight = new THREE.DirectionalLight(surface, 2.8);
			keyLight.position.set(3, 5, 6);
			scene.add(keyLight);

			const cubeGeometry = new THREE.BoxGeometry(0.18, 0.28, 0.18);
			const cubeBase = new THREE.Color(border);
			const blastRed = '#c83f38';
			const cubeBlast = new THREE.Color(blastRed);
			/** @type {Array<{ mesh: any, material: any, label: HTMLElement, value: HTMLElement, localNormal: any }>} */
			const targetVisuals = [];

			for (const target of TARGETS) {
				const localNormal = new THREE.Vector3(...target.normal).normalize();
				const material = new THREE.MeshBasicMaterial({ color: cubeBase });
				const mesh = new THREE.Mesh(cubeGeometry, material);
				mesh.position.copy(localNormal).multiplyScalar(planetRadius + 0.14);
				mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localNormal);
				planetGroup.add(mesh);

				const label = document.createElement('div');
				label.className = 'q50-target-label';
				const name = document.createElement('span');
				name.textContent = target.label;
				const value = document.createElement('strong');
				value.textContent = '0%';
				label.append(name, value);
				const labelObject = new CSS2DObject(label);
				labelObject.position.copy(localNormal).multiplyScalar(planetRadius + 0.5);
				planetGroup.add(labelObject);
				targetVisuals.push({ mesh, material, label, value, localNormal });
			}

			let randomState = 0x50a57e1d;
			const random = () => {
				randomState = (1664525 * randomState + 1013904223) >>> 0;
				return randomState / 0x100000000;
			};
			const starPositions = [];
			for (let i = 0; i < 260; i += 1) {
				const y = random() * 2 - 1;
				const angle = random() * Math.PI * 2;
				const radius = 13 + random() * 18;
				const spread = Math.sqrt(1 - y * y);
				starPositions.push(
					Math.cos(angle) * spread * radius,
					y * radius,
					Math.sin(angle) * spread * radius
				);
			}
			const starGeometry = new THREE.BufferGeometry();
			starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
			const starMaterial = new THREE.PointsMaterial({ color: muted, size: 0.045, sizeAttenuation: true });
			scene.add(new THREE.Points(starGeometry, starMaterial));

			const impactWorld = new THREE.Vector3(...IMPACT_DIRECTION).normalize();
			const asteroidStart = impactWorld.clone().multiplyScalar(5.8);
			const asteroidEnd = impactWorld.clone().multiplyScalar(planetRadius + 0.12);
			const impactTravelStart = asteroidStart.clone();
			const asteroidGeometry = new THREE.DodecahedronGeometry(0.25, 0);
			const asteroidMaterial = new THREE.MeshStandardMaterial({
				color: muted,
				roughness: 1,
				flatShading: true
			});
			const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
			asteroid.position.copy(asteroidStart);
			scene.add(asteroid);

			const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints([
				asteroidEnd,
				asteroidStart
			]);
			const trajectoryMaterial = new THREE.LineDashedMaterial({
				color: blastRed,
				dashSize: 0.12,
				gapSize: 0.1,
				transparent: true,
				opacity: 0.7
			});
			const trajectory = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
			trajectory.computeLineDistances();
			scene.add(trajectory);

			/** @param {number} angle @param {string} color @param {number} opacity @param {number} [thickness] */
			function capRing(angle, color, opacity, thickness = 0) {
				const reference = Math.abs(impactWorld.y) < 0.9
					? new THREE.Vector3(0, 1, 0)
					: new THREE.Vector3(1, 0, 0);
				const u = new THREE.Vector3().crossVectors(impactWorld, reference).normalize();
				const v = new THREE.Vector3().crossVectors(impactWorld, u).normalize();
				const points = [];
				for (let i = 0; i < 96; i += 1) {
					const turn = (i / 96) * Math.PI * 2;
					points.push(
						impactWorld
							.clone()
							.multiplyScalar(Math.cos(angle))
							.add(u.clone().multiplyScalar(Math.sin(angle) * Math.cos(turn)))
							.add(v.clone().multiplyScalar(Math.sin(angle) * Math.sin(turn)))
							.multiplyScalar(planetRadius + 0.025)
					);
				}
				if (thickness > 0) {
					const curve = new THREE.CatmullRomCurve3(points, true);
					const geometry = new THREE.TubeGeometry(curve, 96, thickness, 6, true);
					const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
					const ring = new THREE.Mesh(geometry, material);
					scene.add(ring);
					return ring;
				}
				const geometry = new THREE.BufferGeometry().setFromPoints(points);
				const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
				const ring = new THREE.LineLoop(geometry, material);
				scene.add(ring);
				return ring;
			}

			const blastCapGeometry = new THREE.SphereGeometry(
				planetRadius + 0.035,
				64,
				16,
				0,
				Math.PI * 2,
				0,
				DAMAGE_RADIUS_RADIANS
			);
			const blastCapMaterial = new THREE.MeshBasicMaterial({
				color: blastRed,
				transparent: true,
				opacity: 0.24,
				depthWrite: false,
				side: THREE.DoubleSide
			});
			const blastCap = new THREE.Mesh(blastCapGeometry, blastCapMaterial);
			blastCap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), impactWorld);
			blastCap.renderOrder = 1;
			scene.add(blastCap);

			capRing(DAMAGE_RADIUS_RADIANS, blastRed, 1, 0.022);
			capRing((4 * Math.PI) / 180, blastRed, 1);

			const impactDotGeometry = new THREE.CircleGeometry(0.16, 32);
			const impactDotMaterial = new THREE.MeshBasicMaterial({
				color: blastRed,
				depthTest: true,
				side: THREE.DoubleSide
			});
			const impactDot = new THREE.Mesh(impactDotGeometry, impactDotMaterial);
			impactDot.position.copy(impactWorld).multiplyScalar(planetRadius + 0.055);
			impactDot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), impactWorld);
			impactDot.renderOrder = 2;
			scene.add(impactDot);

			const pulseGeometry = new THREE.SphereGeometry(0.08, 12, 8);
			const pulseMaterial = new THREE.MeshBasicMaterial({ color: surface, transparent: true });
			const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
			pulse.position.copy(asteroidEnd);
			pulse.visible = false;
			scene.add(pulse);

			const shockwaveGeometry = new THREE.TorusGeometry(0.18, 0.026, 8, 64);
			const shockwaveMaterial = new THREE.MeshBasicMaterial({
				color: blastRed,
				transparent: true,
				opacity: 0,
				depthWrite: false
			});
			const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
			shockwave.position.copy(asteroidEnd).addScaledVector(impactWorld, 0.025);
			shockwave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), impactWorld);
			shockwave.visible = false;
			scene.add(shockwave);

			const particleReference = Math.abs(impactWorld.y) < 0.9
				? new THREE.Vector3(0, 1, 0)
				: new THREE.Vector3(1, 0, 0);
			const particleU = new THREE.Vector3().crossVectors(impactWorld, particleReference).normalize();
			const particleV = new THREE.Vector3().crossVectors(impactWorld, particleU).normalize();

			/** @param {number} count @param {number} minSpeed @param {number} maxSpeed */
			function createExplosionParticles(count, minSpeed, maxSpeed) {
				const positions = new Float32Array(count * 3);
				const velocities = [];
				for (let index = 0; index < count; index += 1) {
					positions[index * 3] = asteroidEnd.x;
					positions[index * 3 + 1] = asteroidEnd.y;
					positions[index * 3 + 2] = asteroidEnd.z;
					const angle = random() * Math.PI * 2;
					const spread = 0.18 + random() * 1.15;
					const direction = impactWorld
						.clone()
						.multiplyScalar(0.35 + random() * 0.9)
						.addScaledVector(particleU, Math.cos(angle) * spread)
						.addScaledVector(particleV, Math.sin(angle) * spread)
						.normalize();
					velocities.push(direction.multiplyScalar(minSpeed + random() * (maxSpeed - minSpeed)));
				}
				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
				return { geometry, velocities };
			}

			const sparksData = createExplosionParticles(240, 0.75, 2.8);
			const sparksMaterial = new THREE.PointsMaterial({
				color: '#e55a43',
				size: 0.075,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			});
			const sparks = new THREE.Points(sparksData.geometry, sparksMaterial);
			sparks.visible = false;
			scene.add(sparks);

			const debrisData = createExplosionParticles(90, 0.35, 1.35);
			const debrisMaterial = new THREE.PointsMaterial({
				color: ink,
				size: 0.06,
				transparent: true,
				opacity: 0,
				depthWrite: false
			});
			const debris = new THREE.Points(debrisData.geometry, debrisMaterial);
			debris.visible = false;
			scene.add(debris);

			/** @param {{ geometry: any, velocities: any[] }} data @param {number} seconds */
			function updateExplosionParticles(data, seconds) {
				const attribute = data.geometry.getAttribute('position');
				for (let index = 0; index < data.velocities.length; index += 1) {
					const velocity = data.velocities[index];
					attribute.setXYZ(
						index,
						asteroidEnd.x + velocity.x * seconds,
						asteroidEnd.y + velocity.y * seconds,
						asteroidEnd.z + velocity.z * seconds
					);
				}
				attribute.needsUpdate = true;
			}

			function updateDamage() {
				const inverse = planetGroup.quaternion.clone().invert();
				const localImpact = impactWorld.clone().applyQuaternion(inverse).normalize();
				damage = displayPercentages(damageAt([localImpact.x, localImpact.y, localImpact.z]));
				damage.forEach((item, index) => {
					const visual = targetVisuals[index];
					const emphasis = Math.min(1, Math.sqrt(item.share) * 1.6);
					visual.material.color.copy(cubeBase);
					if (item.share > 0) {
						visual.material.color.lerp(cubeBlast, 0.65 + emphasis * 0.35);
					}
					visual.mesh.scale.setScalar(1 + emphasis * 0.75);
					visual.value.textContent = item.percent > 0 ? `${item.percent}%` : '—';
					visual.label.classList.toggle('is-affected', item.percent > 0);
				});
			}

			// Pointer events arrive faster than the display refreshes, and every
			// updateDamage() re-scores 18 targets, rewrites 18 labels, and reassigns a
			// $state that re-sorts, re-filters and re-renders the ledger. Coalesce to
			// at most one per frame. `flushDamage` is not optional: committing scores
			// off `damage`, so a pending update must land before the score is taken.
			let damageQueued = 0;
			function queueDamage() {
				if (damageQueued) return;
				damageQueued = requestAnimationFrame(() => {
					damageQueued = 0;
					updateDamage();
				});
			}
			function flushDamage() {
				if (!damageQueued) return;
				cancelAnimationFrame(damageQueued);
				damageQueued = 0;
				updateDamage();
			}

			rotatePlanet = (axis, angle) => {
				if (phase !== 'active') return;
				if (angle === 0) planetGroup.quaternion.identity();
				else {
					const vector = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
					planetGroup.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(vector, angle));
					planetGroup.quaternion.normalize();
				}
				queueDamage();
			};

			let pointerId = -1;
			/** @type {DOMRect | null} */
			let canvasRect = null;
			/** @type {import('three').Vector3 | null} */
			let previousArcball = null;
			/** @param {PointerEvent} event */
			function arcballPoint(event) {
				// Cached per drag: this ran on every pointermove, and
				// getBoundingClientRect() forces a synchronous layout each time.
				const bounds = (canvasRect ??= canvasElement.getBoundingClientRect());
				let x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
				let y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
				const squared = x * x + y * y;
				let z;
				if (squared <= 1) z = Math.sqrt(1 - squared);
				else {
					const scale = 1 / Math.sqrt(squared);
					x *= scale;
					y *= scale;
					z = 0;
				}
				return new THREE.Vector3(x, y, z).normalize();
			}
			/** @param {PointerEvent} event */
			function pointerDown(event) {
				if (phase !== 'active') return;
				pointerId = event.pointerId;
				canvasRect = null; // re-measure once at the start of each drag
				previousArcball = arcballPoint(event);
				canvasElement.setPointerCapture(pointerId);
				canvasElement.classList.add('is-dragging');
				void playSfx('drag-pickup', { volume: 0.7 });
				canvasElement.focus();
			}
			/** @param {PointerEvent} event */
			function pointerMove(event) {
				if (event.pointerId !== pointerId || !previousArcball || phase !== 'active') return;
				event.preventDefault();
				const current = arcballPoint(event);
				const rotation = new THREE.Quaternion().setFromUnitVectors(previousArcball, current);
				planetGroup.quaternion.premultiply(rotation).normalize();
				previousArcball = current;
				queueDamage();
			}
			/** @param {PointerEvent} event */
			function pointerUp(event) {
				if (event.pointerId !== pointerId) return;
				pointerId = -1;
				previousArcball = null;
				canvasElement.classList.remove('is-dragging');
				void playSfx('drop-valid', { volume: 0.65, rate: 0.9 });
			}
			canvasElement.addEventListener('pointerdown', pointerDown);
			canvasElement.addEventListener('pointermove', pointerMove);
			canvasElement.addEventListener('pointerup', pointerUp);
			canvasElement.addEventListener('pointercancel', pointerUp);

			let deadline = 0;
			let pausedRemainingMs = COUNTDOWN_MS;
			let impactStarted = 0;
			let finalScore = {};
			let lastTimerPaint = 0;
			let lastWarningSecond = 9;
			let impactSoundPlayed = false;
			let whiteoutStarted = false;
			const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

			function beginTimer() {
				if (phase !== 'ready' || document.hidden) return;
				// A browser cannot autoplay a debug deep link. Hold the countdown at
				// 30 until the first gesture unlocks the dedicated cue, then launch
				// both clocks together so the authored silent tail stays in sync.
				if (
					audioState.enabled &&
					audioState.musicTrack !== 'asteroid' &&
					!audioState.musicFailed
				)
					return;
				deadline = performance.now() + pausedRemainingMs;
				remaining = debugInfinite ? DEBUG_DISPLAY_SECONDS : pausedRemainingMs / 1000;
				phase = 'active';
			}
			tryBeginTimer = beginTimer;

			setDebugMode = (enabled) => {
				const now = performance.now();
				if (phase === 'active') {
					if (enabled && !debugInfinite) {
						pausedRemainingMs = Math.max(0, deadline - now);
						remaining = DEBUG_DISPLAY_SECONDS;
					} else if (!enabled && debugInfinite) {
						deadline = now + pausedRemainingMs;
						remaining = pausedRemainingMs / 1000;
					}
				} else {
					remaining = enabled ? DEBUG_DISPLAY_SECONDS : pausedRemainingMs / 1000;
				}
				debugInfinite = enabled;
			};

			commitOrientation = (autoLocked) => {
				if (phase !== 'active') return;
				// A rotation from this same frame may still be queued, and the score is
				// taken from `damage` on the next line.
				flushDamage();
				const timeLeft = debugInfinite
					? pausedRemainingMs
					: Math.max(0, deadline - performance.now());
				const elapsedMs = autoLocked ? COUNTDOWN_MS : COUNTDOWN_MS - timeLeft;
				finalScore = scoreImpact(damage, { elapsedMs, autoLocked });
				impactTravelStart.copy(asteroid.position);
				remaining = 0;
				phase = 'impact';
				impactStarted = performance.now();
				// The dedicated score has its own silent tail at the natural deadline;
				// an early lock creates the same breath before the external impact.
				duckMusic('asteroid', 0);
				void playSfx('asteroid-approach');
			};

			let interactionVisible = false;
			const intersectionObserver = new IntersectionObserver(
				(entries) => {
					interactionVisible = (entries[0]?.intersectionRatio ?? 0) >= 0.55;
					if (interactionVisible) beginTimer();
				},
				{ threshold: [0.55] }
			);
			intersectionObserver.observe(viewportElement);
			const visibilityChanged = () => {
				if (!document.hidden && interactionVisible) beginTimer();
			};
			document.addEventListener('visibilitychange', visibilityChanged);

			const resizeObserver = new ResizeObserver(() => {
				const bounds = viewportElement.getBoundingClientRect();
				const width = Math.max(1, Math.round(bounds.width));
				const height = Math.max(1, Math.round(bounds.height));
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
				renderer.setSize(width, height, false);
				labelRenderer.setSize(width, height);
				canvasRect = null;
			});
			resizeObserver.observe(viewportElement);

			updateDamage();
			phase = 'ready';

			// Reused every frame by the label-facing loop below.
			const scratchNormal = new THREE.Vector3();
			const scratchSurface = new THREE.Vector3();
			const scratchToCamera = new THREE.Vector3();
			/** @type {string[]} */
			const lastVisibility = [];
			/** @type {string[]} */
			const lastOpacity = [];

			renderer.setAnimationLoop((now) => {
				if (disposed) return;
				asteroid.rotation.x += 0.002;
				asteroid.rotation.y += 0.003;

				if (phase === 'active' && !debugInfinite && now - lastTimerPaint > 50) {
					remaining = Math.max(0, (deadline - now) / 1000);
					const warningSecond = Math.ceil(remaining);
					if (remaining > 0 && remaining <= 8 && warningSecond < lastWarningSecond) {
						lastWarningSecond = warningSecond;
						void playSfx('asteroid-warning', {
							rate: 1 + (8 - warningSecond) * 0.04
						});
					}
					const approach = Math.max(0, Math.min(1, 1 - (deadline - now) / COUNTDOWN_MS));
					asteroid.position.lerpVectors(asteroidStart, asteroidEnd, approach * 0.82);
					lastTimerPaint = now;
					if (remaining <= 0) commitOrientation(true);
				}

				if (phase === 'impact') {
					const elapsed = now - impactStarted;
					const travelDuration = reduceMotion ? 1 : 750;
					const progress = Math.min(1, elapsed / travelDuration);
					const eased = 1 - Math.pow(1 - progress, 3);
					asteroid.position.lerpVectors(impactTravelStart, asteroidEnd, eased);
					trajectory.visible = progress < 0.98;
					if (progress >= 1) {
						if (!impactSoundPlayed) {
							impactSoundPlayed = true;
							// The aftermath begins at the exact visual centre of the canvas,
							// then expands across the surrounding certificate.
							const viewportBounds = viewportElement.getBoundingClientRect();
							const frameBounds =
								viewportElement.closest('.frame')?.getBoundingClientRect() ?? viewportBounds;
							const q50Bounds =
								viewportElement.closest('.q50')?.getBoundingClientRect() ?? frameBounds;
							// The overlay is positioned inside `.q50`, so its rectangle and its
							// circle origin must both use that same coordinate space.
							whiteoutLeft = frameBounds.left - q50Bounds.left;
							whiteoutTop = frameBounds.top - q50Bounds.top;
							whiteoutWidth = frameBounds.width;
							whiteoutHeight = frameBounds.height;
							whiteoutX =
								viewportBounds.left + viewportBounds.width / 2 - frameBounds.left;
							whiteoutY =
								viewportBounds.top + viewportBounds.height / 2 - frameBounds.top;
							void playSfx('asteroid-impact', { tag: 'asteroid-impact' });
						}
						asteroid.visible = false;
						pulse.visible = true;
						shockwave.visible = true;
						sparks.visible = !reduceMotion;
						debris.visible = !reduceMotion;
						const explosionElapsed = Math.max(0, elapsed - travelDuration);
						const explosionSeconds = explosionElapsed / 1000;
						if (explosionElapsed >= 180 && !whiteoutStarted) {
							whiteoutStarted = true;
							whiteout = true;
						}
						const pulseProgress = Math.min(1, explosionElapsed / (reduceMotion ? 80 : 420));
						pulse.scale.setScalar(1 + pulseProgress * 8);
						pulseMaterial.opacity = 1 - pulseProgress;
						const shockwaveProgress = Math.min(1, explosionElapsed / 1400);
						shockwave.scale.setScalar(1 + shockwaveProgress * 10);
						shockwaveMaterial.opacity = reduceMotion ? 0.7 : (1 - shockwaveProgress) * 0.9;
						if (!reduceMotion) {
							updateExplosionParticles(sparksData, explosionSeconds);
							updateExplosionParticles(debrisData, explosionSeconds);
							sparksMaterial.opacity = Math.max(0, 1 - explosionElapsed / 2800);
							debrisMaterial.opacity = Math.max(0, 0.9 - explosionElapsed / 4600);
						}
					}
					const totalDuration = travelDuration + 3800;
					if (elapsed >= totalDuration && !answerSent) {
						answerSent = true;
						phase = 'resolved';
						onAnswer(finalScore);
					}
				}

				// This ran three Vector3 clones per label per frame — 54 allocations a
				// frame at 18 labels, all of it garbage — and wrote two inline styles
				// per label whether or not anything had changed. Scratch vectors and a
				// change check remove both.
				for (let vi = 0; vi < targetVisuals.length; vi += 1) {
					const visual = targetVisuals[vi];
					scratchNormal.copy(visual.localNormal).applyQuaternion(planetGroup.quaternion);
					scratchSurface.copy(scratchNormal).multiplyScalar(planetRadius);
					scratchToCamera.copy(camera.position).sub(scratchSurface).normalize();
					const facing = scratchNormal.dot(scratchToCamera);
					const labelOpacity = Math.max(0, Math.min(1, (facing - 0.16) / 0.3));
					const visibility = labelOpacity > 0 ? 'visible' : 'hidden';
					if (lastVisibility[vi] !== visibility) {
						visual.label.style.visibility = visibility;
						lastVisibility[vi] = visibility;
					}
					// Two decimals is well below what the eye resolves, and it stops a
					// drifting float from invalidating styles every single frame.
					const opacity = labelOpacity.toFixed(2);
					if (lastOpacity[vi] !== opacity) {
						visual.label.style.opacity = opacity;
						lastOpacity[vi] = opacity;
					}
				}
				renderer.render(scene, camera);
				labelRenderer.render(scene, camera);
			});

			cleanupRuntime = () => {
				tryBeginTimer = () => {};
				stopSfx('asteroid-impact');
				clearMusicDuck('asteroid');
				renderer.setAnimationLoop(null);
				intersectionObserver.disconnect();
				resizeObserver.disconnect();
				document.removeEventListener('visibilitychange', visibilityChanged);
				canvasElement.removeEventListener('pointerdown', pointerDown);
				canvasElement.removeEventListener('pointermove', pointerMove);
				canvasElement.removeEventListener('pointerup', pointerUp);
				canvasElement.removeEventListener('pointercancel', pointerUp);
				/** @type {Set<import('three').BufferGeometry>} */
				const geometries = new Set();
				/** @type {Set<import('three').Material>} */
				const materials = new Set();
				scene.traverse((object) => {
					const renderable = /** @type {import('three').Object3D & { geometry?: import('three').BufferGeometry, material?: import('three').Material | import('three').Material[] }} */ (object);
					if (renderable.geometry) geometries.add(renderable.geometry);
					const objectMaterials = Array.isArray(renderable.material)
						? renderable.material
						: [renderable.material];
					for (const material of objectMaterials) if (material) materials.add(material);
				});
				for (const geometry of geometries) geometry.dispose();
				for (const material of materials) material.dispose();
				renderer.dispose();
				labelRenderer.domElement.remove();
			};
		}

		setup().catch((error) => {
			cleanupRuntime();
			if (disposed) return;
			console.error('Q50 WebGL setup failed', error);
			failure = 'This instrument requires WebGL 2, which is not available here.';
			phase = 'error';
		});

		return () => {
			disposed = true;
			commitOrientation = () => {};
			rotatePlanet = () => {};
			setDebugMode = () => {};
			cleanupRuntime();
		};
	});
</script>

<section class="q50">
	{#if whiteout}
		<div
			class="whiteout"
			style="left: {whiteoutLeft}px; top: {whiteoutTop}px; width: {whiteoutWidth}px; height: {whiteoutHeight}px; --impact-x: {whiteoutX}px; --impact-y: {whiteoutY}px"
			aria-hidden="true"
		></div>
	{/if}
	<p class="premise">
		You created this world. It is inhabited. An asteroid will strike in thirty seconds. It
		cannot be diverted. You may rotate the planet.
	</p>
	<h2>Choose the point of impact.</h2>

	<div class="instrument">
		{#if phase === 'error'}
			<div class="failure" role="alert">
				<p>{failure}</p>
				<button class="continue" onclick={continueWithoutAnswer}>Continue</button>
			</div>
		{:else}
			<div
				class="viewport"
				bind:this={viewport}
			>
				<strong
					class="countdown"
					role="timer"
					aria-label={debugInfinite
						? 'Countdown suspended for debugging'
						: `${remaining.toFixed(1)} seconds remaining`}
				>
					T−{remaining.toFixed(1)}
				</strong>
				<canvas
					bind:this={canvas}
					tabindex="0"
					onkeydown={handleKey}
					aria-label="Rotatable planet. Drag to orient the impact point. Arrow keys rotate; R resets."
				></canvas>
			</div>

			<div class="damage-ledger" aria-label="Affected entities and damage allocation">
				<div class="ledger-grid">
					{#each damageSlots as item, index (index)}
						{#if item}
							<div class="ledger-row">
								<span>{item.label}</span>
								<strong>{item.percent}%</strong>
							</div>
						{:else}
							<div class="ledger-row ledger-row--empty" aria-hidden="true"></div>
						{/if}
					{/each}
				</div>
			</div>

			{#if import.meta.env.DEV}
				<label class="debug-toggle">
					<input type="checkbox" checked={debugInfinite} onchange={changeDebugMode} />
					<span>Debug: suspend countdown</span>
				</label>
			{/if}

		{/if}
	</div>
</section>

<style>
	.q50 {
		position: relative;
		animation: rise 0.45s both;
	}
	.whiteout {
		position: absolute;
		z-index: 20;
		background: #fff;
		clip-path: circle(0 at var(--impact-x) var(--impact-y));
		pointer-events: none;
		animation: impact-whiteout 3s cubic-bezier(0.3, 0, 0.2, 1) forwards;
	}
	@keyframes impact-whiteout {
		to {
			clip-path: circle(200vmax at var(--impact-x) var(--impact-y));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.whiteout {
			animation-duration: 120ms;
		}
	}
	.premise {
		color: var(--muted);
		margin: 0 0 0.75rem;
	}
	h2 {
		font-size: clamp(1.65rem, 5vw, 2.25rem);
		line-height: 1.12;
		margin: 0 0 1.5rem;
		color: var(--ink);
	}
	.instrument {
		background: transparent;
	}
	.ledger-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.countdown {
		position: absolute;
		top: 0.65rem;
		right: 0.75rem;
		z-index: 3;
		padding: 0.22rem 0.38rem;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.1em;
	}
	.viewport {
		position: relative;
		height: clamp(28rem, 92vw, 34rem);
		background: var(--surface);
		overflow: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		cursor: grab;
		outline-offset: -3px;
	}
	:global(canvas.is-dragging) {
		cursor: grabbing;
	}
	canvas:focus-visible {
		outline: 2px solid var(--surface);
	}
	:global(.q50-label-layer) {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}
	:global(.q50-target-label) {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		max-width: 8rem;
		padding: 0.18rem 0.32rem;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.56rem;
		line-height: 1.15;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
		transform: translateY(-0.45rem);
		transition: opacity 80ms linear;
	}
	:global(.q50-target-label strong) {
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	:global(.q50-target-label.is-affected) {
		border-color: var(--ink);
		font-weight: 700;
	}
	:global(.q50-target-label.is-affected strong) {
		color: var(--ink);
	}
	.damage-ledger {
		padding: 0.55rem 0;
	}
	.ledger-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: repeat(3, 2rem);
	}
	.ledger-row {
		min-width: 0;
		height: 2rem;
		padding: 0.3rem 0;
		border-top: 1px solid var(--border);
		font-size: 0.7rem;
	}
	.ledger-row span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ledger-row strong {
		font-variant-numeric: tabular-nums;
	}
	.ledger-row--empty {
		visibility: hidden;
	}
	.debug-toggle {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.85rem;
		border-top: 1px solid var(--border);
		color: var(--muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
	}
	.debug-toggle input {
		margin: 0;
		accent-color: var(--ink);
	}
	.continue {
		display: block;
		width: 100%;
		min-height: 3.25rem;
		border: 0;
		border-top: 1px solid var(--ink);
		background: var(--ink);
		color: var(--surface);
		font-weight: 700;
		cursor: pointer;
	}
	.continue:focus-visible {
		outline: 3px solid var(--ink);
		outline-offset: 3px;
	}
	.failure {
		padding: 2rem 1rem 0;
		text-align: center;
	}
	.failure p {
		color: var(--muted);
		margin: 0 0 2rem;
	}
	.failure .continue {
		margin-inline: -1rem;
		width: calc(100% + 2rem);
	}
	@media (max-width: 520px) {
		.viewport {
			height: 28rem;
		}
		.ledger-grid {
			grid-template-columns: 1fr;
		}
		:global(.q50-target-label) {
			font-size: 0.5rem;
			max-width: 6.5rem;
		}
	}
</style>
