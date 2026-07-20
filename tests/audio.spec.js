// @ts-nocheck -- browser-side Vite module URLs are intentionally resolved at runtime.
import { expect, test } from '@playwright/test';

const AUDIO_ASSETS = [
	'/audio/music/puzzle-chamber-loop.mp3',
	'/audio/music/asteroid-countdown.mp3',
	'/audio/music/final-report-loop.mp3',
	...[
		'ui-tap',
		'ui-toggle',
		'ui-confirm',
		'slider-detent',
		'drag-pickup',
		'drop-valid',
		'drop-invalid',
		'page-turn',
		'chat-send',
		'illusion-reveal',
		'balance-settle',
		'elevator-button',
		'elevator-approach',
		'elevator-open',
		'elevator-shut',
		'asteroid-warning',
		'asteroid-approach',
		'asteroid-impact',
		'result-reveal'
	].map((name) => `/audio/sfx/${name}.mp3`)
];

/** Wait for the client effect that installs the initial explicit-silence intent. */
async function waitForHydration(page) {
	await expect
		.poll(async () => {
			try {
				return await page.evaluate(() => window.__quizAudio?.snapshot().revision ?? 0);
			} catch {
				// A dev-server full reload can replace the execution context between
				// navigation and hydration. Poll the replacement document instead of
				// turning that transient into a browser-specific failure.
				return 0;
			}
		}, {
			timeout: 15_000
		})
		.toBeGreaterThan(0);
}

/** Read the exact singleton used by the rendered app, including through HMR URLs. */
async function audioState(page) {
	return page.evaluate(() =>
		window.__quizAudio?.snapshot() ?? {
			status: 'booting',
			requestedTrack: null,
			started: false,
			enabled: false,
			cueKey: ''
		}
	);
}

test('every registered audio asset is served', async ({ request }) => {
	for (const path of AUDIO_ASSETS) {
		const response = await request.get(path);
		expect(response.ok(), path).toBe(true);
		expect(response.headers()['content-type'], path).toContain('audio');
	}
});

test('the elevator runner pictogram loads before the doors move', async ({ page }) => {
	await page.goto('/');
	const elevatorQuestion = await page.evaluate(async () => {
		const { questions } = await import('/src/lib/questions/index.js');
		return questions.findIndex((question) => question.id === 'elevator-doors') + 1;
	});
	expect(elevatorQuestion).toBeGreaterThan(0);

	await page.goto(`/?q=${elevatorQuestion}`);
	const runner = page.locator('img.runner');
	await expect(runner).toBeVisible();
	await expect
		.poll(() => runner.evaluate((image) => (image.complete ? image.naturalWidth : 0)))
		.toBeGreaterThan(0);
});

test('Begin installs the default cue and sound can be toggled', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => localStorage.removeItem('personality-quiz-sound'));
	await page.reload();
	await waitForHydration(page);

	await page.getByRole('button', { name: 'Begin' }).click();
	await expect.poll(async () => (await audioState(page)).requestedTrack).toBe('default');
	await expect.poll(async () => (await audioState(page)).started).toBe(true);
	await expect.poll(async () => (await audioState(page)).status).toBe('playing');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('default');
	const startsBeforeMute = await page.evaluate(
		() => window.__quizAudio.trace.filter((entry) => entry.event === 'music-start').length
	);

	const sound = page.getByRole('button', { name: 'Mute quiz sound' });
	await sound.click();
	await expect.poll(async () => (await audioState(page)).enabled).toBe(false);
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('default');
	await page.getByRole('button', { name: 'Turn on quiz sound' }).click();
	await expect.poll(async () => (await audioState(page)).enabled).toBe(true);
	await expect.poll(async () => (await audioState(page)).status).toBe('playing');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('default');
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__quizAudio.trace.filter((entry) => entry.event === 'music-start').length
			)
		)
		.toBe(startsBeforeMute);
});

test('deep-linked asteroid and final breath install explicit intents', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	const asteroidQuestion = await page.evaluate(async () => {
		const { questions } = await import('/src/lib/questions/index.js');
		return questions.findIndex((question) => question.id === 'asteroid-impact') + 1;
	});
	expect(asteroidQuestion).toBeGreaterThan(0);

	await page.goto(`/?q=${asteroidQuestion}`);
	await waitForHydration(page);
	await expect.poll(async () => (await audioState(page)).requestedTrack).toBe('asteroid');
	await page.mouse.click(8, 8);
	await expect.poll(async () => (await audioState(page)).cueKey).toContain('asteroid');
	await expect.poll(async () => (await audioState(page)).status).toBe('playing');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('asteroid');

	const finalInterlude = await page.evaluate(async () => {
		const { interludes } = await import('/src/lib/interludes.js');
		return interludes.length;
	});
	await page.goto(`/?i=${finalInterlude}`);
	await waitForHydration(page);
	await expect.poll(async () => (await audioState(page)).requestedTrack).toBe('');
	await expect.poll(async () => (await audioState(page)).status).toBe('silent');
});

test('the public music API switches and stops within one document', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Begin' }).click();
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('default');

	await page.evaluate(() =>
		window.__quizAudio.play('report', {
			cueKey: 'browser-test:report',
			transition: 'cut'
		})
	);
	await expect.poll(async () => (await audioState(page)).status).toBe('playing');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('report');

	await page.evaluate(() => window.__quizAudio.stop());
	await expect.poll(async () => (await audioState(page)).status).toBe('silent');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('');
});

test('recoverable audio is exposed as an explicit restore action', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Begin' }).click();
	await expect.poll(async () => (await audioState(page)).started).toBe(true);
	// Do not manufacture an interruption while the initial decode is still
	// reconciling; that would test an impossible overlap of two synthetic calls.
	await expect
		.poll(async () => (await audioState(page)).status, { timeout: 15_000 })
		.toBe('playing');
	await page.evaluate(() => window.__quizAudio.suspend());
	await expect(page.getByRole('button', { name: 'Tap to restore quiz sound' })).toBeVisible();
	await page.getByRole('button', { name: 'Tap to restore quiz sound' }).click();
	await expect(page.getByRole('button', { name: 'Mute quiz sound' })).toBeVisible();
	await expect.poll(async () => (await audioState(page)).status).toBe('playing');
	await expect.poll(async () => (await audioState(page)).activeTrack).toBe('default');
	await expect
		.poll(() =>
			page.evaluate(
				() => window.__quizAudio.trace.filter((entry) => entry.event === 'context-created').length
			)
		)
		.toBe(2);
});
