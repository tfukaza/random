// @ts-nocheck -- development inspection hooks intentionally live on Window.
import { expect, test } from '@playwright/test';

async function questionNumber(page, id) {
	await page.goto('/');
	// Let the root onMount complete before importing through Vite; otherwise a
	// debug-route remount can destroy the evaluation context on slower engines.
	await page.waitForTimeout(100);
	return page.evaluate(async (questionId) => {
		const { questions } = await import('/src/lib/questions/index.js');
		return questions.findIndex((question) => question.id === questionId) + 1;
	}, id);
}

test('declining to provide a birth date skips directly to the next question', async ({ page }) => {
	const q = await questionNumber(page, 'birth-date');
	await page.goto(`/?q=${q}`);
	await page.getByRole('button', { name: 'I would rather not say' }).click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));

	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts[0]);
	expect(attempt.response).toMatchObject({
		format: 'date',
		value: 'withheld',
		label: 'Would rather not say'
	});
	expect(attempt.submitAttempts).toBe(1);
});

test('a choice remains editable until the dedicated submit action', async ({ page }) => {
	const q = await questionNumber(page, 'party');
	await page.goto(`/?q=${q}`);
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeDisabled();

	const choices = page.locator('[data-answer-id]');
	await choices.nth(0).click();
	await choices.nth(1).click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q}$`));
	await expect(submit).toBeEnabled();

	const draft = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(draft.selectionCount).toBe(2);
	expect(draft.revisionCount).toBe(1);
	expect(draft.submitAttempts).toBe(0);

	await submit.click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
	const submitted = await page.evaluate(() => window.__quizMetrics.snapshot().attempts[0]);
	expect(submitted.submitAttempts).toBe(1);
	expect(submitted.response.format).toBe('single-choice');
});

test('survey sliders can submit their visible midpoint without being moved', async ({ page }) => {
	const q = await questionNumber(page, 'honesty-claim');
	await page.goto(`/?q=${q}`);
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeEnabled();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q}$`));
	await expect(page.locator('input[type="range"]')).toHaveValue('4');
	await submit.click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));

	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts[0]);
	expect(attempt.response).toMatchObject({ format: 'scalar', value: 4, label: '4' });
	expect(attempt.revisionCount).toBe(0);
	expect(attempt.submitAttempts).toBe(1);
	expect(attempt.events.find((event) => event.type === 'submit-attempt').valid).toBe(true);
});

test('slider revisions count direction changes, not continued movement', async ({ page }) => {
	const q = await questionNumber(page, 'honesty-claim');
	await page.goto(`/?q=${q}`);
	const slider = page.locator('input[type="range"]');
	await slider.press('ArrowLeft');
	await slider.press('ArrowLeft');
	await slider.press('ArrowLeft');
	let attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(0);

	await slider.press('ArrowRight');
	attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(1);
	expect(attempt.events.at(-1).revision.reason).toBe('scalar-direction-reversed');
});

test('multi-selects require a real choice and submit changes color without resizing', async ({ page }) => {
	const q = await questionNumber(page, 'comfort-friend');
	await page.goto(`/?q=${q}`);
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeDisabled();
	await expect(page.locator('[data-answer-id="none"]')).toHaveCount(0);
	await expect(page.getByText('None of these', { exact: true })).toHaveCount(0);

	const dimensions = () =>
		submit.evaluate((element) => {
			const style = getComputedStyle(element);
			return { width: style.width, height: style.height };
		});
	const before = await dimensions();
	await expect(submit).toHaveCSS('background-color', 'rgb(195, 195, 193)');

	await page.locator('[data-answer-id]').first().click();
	await expect(submit).toBeEnabled();
	await expect(submit).toHaveCSS('background-color', 'rgb(34, 34, 32)');
	const after = await dimensions();
	expect(after).toEqual(before);

	// Adding new options is still forming the initial answer. The first
	// deselection is a revision; every toggle after that is another one.
	const choices = page.locator('[data-answer-id]');
	await choices.nth(1).click();
	let attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(0);
	await choices.nth(0).click();
	attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(1);
	await choices.nth(2).click();
	attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(2);
});

test('ranking revisions begin after the full-reversal movement budget', async ({ page }) => {
	const q = await questionNumber(page, 'rank-satisfying');
	await page.goto(`/?q=${q}`);
	const down = page.getByRole('button', { name: 'Move Taking a vacation down' });
	const up = page.getByRole('button', { name: 'Move Taking a vacation up' });

	// Four items have six adjacent-position moves of free reordering: 4×3÷2.
	for (let i = 0; i < 3; i += 1) {
		await down.click();
		await up.click();
	}
	let attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(0);
	expect(attempt.revisionTracking.rankingDistance).toBe(6);

	await down.click();
	attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(1);
	expect(
		attempt.events.findLast((event) => event.revision?.reason === 'ranking-budget-exceeded')
	).toBeTruthy();
});

test('every text-field backspace counts as changing the answer', async ({ page }) => {
	const q = await questionNumber(page, 'favourite-food');
	await page.goto(`/?q=${q}`);
	const input = page.locator('input[type="text"]');
	await input.fill('abcd');
	await input.press('Backspace');
	await input.press('Backspace');
	await input.type('e');

	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.revisionCount).toBe(2);
	expect(attempt.events.filter((event) => event.reason === 'text-backspace')).toHaveLength(2);
});

test('the coffee follow-up only asks for a real donation after a pledge', async ({ page }) => {
	const q = await questionNumber(page, 'coffee-button');

	await page.goto(`/?q=${q}`);
	await page.locator('[data-answer-id="0"]').click();
	await page.locator('[data-answer-submit]').click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
	await expect(page.getByRole('heading', { name: 'What would motivate you to donate money?' })).toBeVisible();
	await expect(page.locator('a[href*="ko-fi.com"]')).toHaveCount(0);

	await page.goto(`/?q=${q}`);
	await page.locator('[data-answer-id="1"]').click();
	await page.locator('[data-answer-submit]').click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
	await expect(page.getByRole('heading', { name: 'How much are you willing to donate?' })).toBeVisible();
	await expect(page.locator('a[href*="ko-fi.com"]')).toHaveCount(1);
	await expect(page.getByText('Enter the code and submit answer.', { exact: true })).toBeVisible();
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeDisabled();
	await page.locator('#donor-code').fill('Quiz789');
	await expect(submit).toBeEnabled();
	await submit.click();
	await expect(page).toHaveURL(/\?i=4$/);
});

test('dinner allocations unwrap Svelte state without DataCloneError', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const q = await questionNumber(page, 'perfect-dinner');
	await page.goto(`/?q=${q}`);

	await page.getByRole('button', { name: 'More Venue' }).click();
	await page.getByRole('button', { name: 'More Appetizer' }).click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q}$`));
	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.draft.format).toBe('allocation');
	expect(attempt.draft.value).toMatchObject({ venue: 10, appetizer: 10 });
	expect(attempt.revisionCount).toBe(0);
	expect(errors).not.toContain(expect.stringContaining('DataCloneError'));

	await page.locator('[data-answer-submit]').click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
});

test('generated box sprites load, drag, and carry into the airport follow-up', async ({ page }) => {
	const q = await questionNumber(page, 'pack-box');
	await page.goto(`/?q=${q}`);
	const sprites = page.locator('.pool-sprite img');
	await expect(sprites).toHaveCount(16);
	await expect
		.poll(() =>
			sprites.evaluateAll((images) =>
			images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
			)
		)
		.toBe(true);

	const guitar = page.locator('.pool-item', { hasText: 'Guitar (4)' }).locator('.pool-sprite');
	const firstCell = page.locator('.grid .cell').first();
	const guitarBox = await guitar.boundingBox();
	const cellBox = await firstCell.boundingBox();
	expect(guitarBox).toBeTruthy();
	expect(cellBox).toBeTruthy();
	await guitar.evaluate((element, point) => {
		element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: point.x, clientY: point.y }));
		window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: point.x, clientY: point.y }));
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: point.x, clientY: point.y }));
	}, { x: cellBox.x + cellBox.width / 2, y: cellBox.y + cellBox.height / 2 });

	const packed = page.locator('.placed[title="Guitar"] img');
	await expect(packed).toBeVisible();
	await expect(packed).toHaveAttribute('src', '/images/box-items/guitar.png');
	await page.getByRole('button', { name: 'That’s everything' }).click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
	const airportSprite = page.locator('.card[data-answer-id="guitar"] img');
	await expect(airportSprite).toBeVisible();
	await expect(airportSprite).toHaveAttribute('src', '/images/box-items/guitar.png');
});

test('every drag surface suppresses accidental text selection', async ({ page }) => {
	const surfaces = [
		['rank-satisfying', '.snapsort-container.rows'],
		['breakup-text', '.quicktype'],
		['alphabet-subset', '.dual'],
		['equalizer', '.panel'],
		['balance-scale', '.rig'],
		['pack-box', '.pack'],
		['honesty-claim', '.slider'],
		['asteroid-impact', 'canvas']
	];

	for (const [id, selector] of surfaces) {
		const q = await questionNumber(page, id);
		await page.goto(`/?q=${q}`);
		const surface = page.locator(selector).first();
		await expect(surface).toBeAttached();
		await expect(surface).toHaveCSS('user-select', 'none');
	}
});

test('the classical balance allows exactly one item on each pan', async ({ page }) => {
	const q = await questionNumber(page, 'balance-scale');
	await page.goto(`/?q=${q}`);
	const pedestal = page.locator('.pedestal-art');
	const beam = page.locator('.beam-art');
	const pans = page.locator('.pan-art');
	await expect(pedestal).toHaveAttribute('src', '/images/balance/pedestal.png');
	await expect(beam).toHaveAttribute('src', '/images/balance/beam.png');
	await expect(pans).toHaveCount(2);
	await expect(pans.first()).toHaveAttribute('src', '/images/balance/pan.png');
	await expect
		.poll(() =>
			page.locator('.rig img').evaluateAll((images) =>
				images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
			)
		)
		.toBe(true);

	await page.getByRole('button', { name: 'A car' }).click();
	await expect(page.locator('.pan-left .chip')).toHaveText('A car');
	await expect(beam).toHaveClass(/settling/);
	await expect(page.locator('.side-left')).toHaveClass(/settling/);
	const animationNames = await page.locator('.rig').evaluate((rig) => ({
		beam: rig.querySelector('.beam-art').getAnimations().map((animation) => animation.animationName),
		leftPan: rig.querySelector('.side-left').getAnimations().map((animation) => animation.animationName),
		rightPan: rig.querySelector('.side-right').getAnimations().map((animation) => animation.animationName)
	}));
	expect(animationNames.beam.some((name) => name.endsWith('-settle'))).toBe(true);
	expect(animationNames.leftPan.some((name) => name.endsWith('-ride'))).toBe(true);
	expect(animationNames.rightPan.some((name) => name.endsWith('-ride'))).toBe(true);
	await page.getByRole('button', { name: 'A refrigerator' }).click();
	await expect(page.locator('.pan-right .chip')).toHaveText('A refrigerator');
	await expect(page.locator('[data-answer-submit]')).toBeEnabled();

	// Both pans are occupied, so the next table item replaces the left item and
	// returns that previous occupant to the table instead of forming a pile.
	await page.getByRole('button', { name: 'Ozempic' }).click();
	await expect(page.locator('.pan-left .chip')).toHaveCount(1);
	await expect(page.locator('.pan-left .chip')).toHaveText('Ozempic');
	await expect(page.locator('.pan-right .chip')).toHaveCount(1);
	await expect(page.locator('.pan-right .chip')).toHaveText('A refrigerator');
	await expect(page.locator('.tray-items')).toContainText('A car');
});

test('retired questions stay out of the flow and remain documented in the hidden gallery', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('a[href="/retired-questions"]')).toHaveCount(0);
	const liveIds = await page.evaluate(async () => {
		const { questions } = await import('/src/lib/questions/index.js');
		return questions.map((question) => question.id);
	});
	expect(liveIds).not.toContain('chat-exit');

	await page.goto('/retired-questions');
	await expect(page.getByRole('heading', { name: 'The gallery of retired questions' })).toBeVisible();
	await expect(page.locator('article')).toHaveCount(14);
	await expect(page.getByText('chat-exit', { exact: true })).toBeVisible();
	await expect(page.getByText('Formerly Question 43', { exact: true })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('the removed alignment and metrics questions are replaced by the pointer heat map', async ({ page }) => {
	const q = await questionNumber(page, 'pointer-heatmap');
	const removed = await page.evaluate(async () => {
		const { questions } = await import('/src/lib/questions/index.js');
		const pointerIndex = questions.findIndex((question) => question.id === 'pointer-heatmap');
		return {
			count: questions.length,
			alignment: questions.some((question) => question.id === 'planet-alignment'),
			metrics: questions.some((question) => question.id === 'metrics-audit'),
			before: questions[pointerIndex - 1]?.id,
			after: questions[pointerIndex + 1]?.id
		};
	});
	expect(removed).toEqual({
		count: 50,
		alignment: false,
		metrics: false,
		before: 'rank-value',
		after: 'decision-audit'
	});

	await page.goto(`/?q=${q}`);
	await page.waitForTimeout(100);
	const picture = page.locator('[data-point-count]');
	await expect(picture).toBeVisible();
	await page.mouse.move(100, 100);
	await page.mouse.move(220, 180, { steps: 8 });
	await page.mouse.down();
	await page.mouse.up();
	const recorded = await page.evaluate(async () => {
		const { snapshotPointerHeatmap } = await import('/src/lib/questions/pointerHeatmap.js');
		return snapshotPointerHeatmap();
	});
	expect(recorded.length).toBeGreaterThan(0);
	expect(recorded.some((point) => point.kind === 'press')).toBe(true);

	const answer = page.getByText(
		'A heat map of where I’ve been clicking and moving my mouse or touch input',
		{ exact: true }
	);
	await answer.click();
	await page.locator('[data-answer-submit]').click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
});

test('rotating circles move one at a time and silently exclude a tapped circle', async ({ page }) => {
	const q = await questionNumber(page, 'rotating-snakes');
	await page.goto(`/?q=${q}`);
	const circles = page.getByRole('button', { name: /^Circle \d+$/ });
	await expect(circles).toHaveCount(16);
	await expect(page.locator('.board')).toHaveAttribute('data-burst-degrees', '3');
	await expect(page.locator('[data-answer-id]')).toHaveCount(3);
	await expect(page.getByRole('button', { name: '3°/s', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '3°/s, but occasional', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Not moving', exact: true })).toBeVisible();
	await expect(page.getByText('1° per second', { exact: true })).toHaveCount(0);

	// Circle 1 is now persistently excluded, but the interaction deliberately
	// leaves no selected/active styling behind.
	await circles.nth(0).click();
	await expect(circles.nth(0)).not.toHaveClass(/selected|chosen|active/);
	const motion = await page.evaluate(async () => {
		const spins = Array.from(document.querySelectorAll('.disc .spin'));
		let maximumSimultaneous = 0;
		let excludedCircleAnimated = false;
		const end = performance.now() + 3_500;
		while (performance.now() < end) {
			const running = spins.map(
				(element) => element.getAnimations().filter((animation) => animation.playState === 'running').length
			);
			maximumSimultaneous = Math.max(
				maximumSimultaneous,
				running.reduce((total, count) => total + count, 0)
			);
			excludedCircleAnimated ||= running[0] > 0;
			await new Promise((resolve) => setTimeout(resolve, 40));
		}
		return { maximumSimultaneous, excludedCircleAnimated };
	});

	expect(motion.maximumSimultaneous).toBe(1);
	expect(motion.excludedCircleAnimated).toBe(false);
});

test('a hovered circle is removed from the rotation schedule', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name.startsWith('mobile'), 'Touch projects exercise the persistent tap path.');
	const q = await questionNumber(page, 'rotating-snakes');
	await page.goto(`/?q=${q}`);
	const circle = page.getByRole('button', { name: 'Circle 1', exact: true });
	await circle.hover();

	const animatedWhileHovered = await circle.evaluate(async (element) => {
		const spin = element.querySelector('.spin');
		const end = performance.now() + 3_500;
		while (performance.now() < end) {
			if (spin.getAnimations().some((animation) => animation.playState === 'running')) return true;
			await new Promise((resolve) => setTimeout(resolve, 40));
		}
		return false;
	});
	expect(animatedWhileHovered).toBe(false);
});

test('the memory scene keeps animated actors in their intended depth layers', async ({ page }) => {
	const q = await questionNumber(page, 'scene-watch');
	await page.goto(`/?q=${q}`);
	const stage = page.locator('[data-scene-stage]');
	await expect(stage).toBeVisible({ timeout: 10_000 });
	await expect(stage.locator('image.scene-base')).toHaveCount(1);
	await expect(stage.locator('image[href$="/bus.png"]')).toHaveCount(1);
	await expect(stage.locator('image[href$="/cat.png"]')).toHaveCount(1);
	await expect(stage.locator('image[href$="/meteor.png"]')).toHaveCount(1);

	const layout = await page.evaluate(() => {
		const box = (selector) => {
			const rect = document.querySelector(selector).getBoundingClientRect();
			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		};
		return {
			stage: box('[data-scene-stage]'),
			bus: box('[data-scene-event="bus-leave"] image'),
			cat: box('[data-scene-event="cat-cross"] image')
		};
	});

	// This specifically guards the old SVG/CSS transform collision, where both
	// actors jumped to the page's upper-left as soon as their animation started.
	expect(layout.bus.x).toBeGreaterThan(layout.stage.x + layout.stage.width * 0.65);
	expect(layout.bus.y).toBeGreaterThan(layout.stage.y + layout.stage.height * 0.5);
	expect(layout.cat.x).toBeGreaterThan(layout.stage.x);
	expect(layout.cat.y).toBeGreaterThan(layout.stage.y + layout.stage.height * 0.55);
});

test('mouse hover and touch drag zoom the whole live scene', async ({ page }) => {
	const q = await questionNumber(page, 'scene-watch');
	await page.goto(`/?q=${q}`);
	const frame = page.locator('.scene-frame');
	await expect(frame).toBeVisible({ timeout: 10_000 });
	const box = await frame.boundingBox();
	expect(box).toBeTruthy();
	const canvas = frame.locator('.scene-canvas');
	await expect(canvas.locator('[data-scene-event]')).toHaveCount(4);

	await frame.dispatchEvent('pointerenter', {
		pointerType: 'mouse',
		pointerId: 1,
		clientX: box.x + box.width * 0.25,
		clientY: box.y + box.height * 0.3
	});
	await expect(canvas).toHaveClass(/zoomed/);
	await expect(canvas).toHaveCSS('transform', /matrix\(3, 0, 0, 3,/);
	await frame.dispatchEvent('pointerleave', { pointerType: 'mouse', pointerId: 1 });
	await expect(canvas).not.toHaveClass(/zoomed/);

	await frame.dispatchEvent('pointerdown', {
		pointerType: 'touch',
		pointerId: 7,
		isPrimary: true,
		clientX: box.x + box.width * 0.35,
		clientY: box.y + box.height * 0.38
	});
	await expect(canvas).toHaveClass(/zoomed/);
	const before = await canvas.getAttribute('style');

	await frame.dispatchEvent('pointermove', {
		pointerType: 'touch',
		pointerId: 7,
		isPrimary: true,
		clientX: box.x + box.width * 0.7,
		clientY: box.y + box.height * 0.65
	});
	await expect.poll(() => canvas.getAttribute('style')).not.toBe(before);

	await frame.dispatchEvent('pointerup', {
		pointerType: 'touch',
		pointerId: 7,
		isPrimary: true,
		clientX: box.x + box.width * 0.7,
		clientY: box.y + box.height * 0.65
	});
	await expect(canvas).not.toHaveClass(/zoomed/);
});

test('replaying the memory scene restarts its actors and observation gate together', async ({ page }) => {
	const q = await questionNumber(page, 'scene-watch');
	await page.goto(`/?q=${q}`);
	const firstStage = page.locator('[data-scene-stage]');
	await expect(firstStage).toBeVisible({ timeout: 10_000 });
	await expect(firstStage).toHaveAttribute('data-scene-replay', '0');
	await firstStage.locator('.watch-clock').evaluate((clock) => clock.getAnimations()[0].finish());
	await expect(page.getByText('Ready.', { exact: true })).toBeVisible();
	await expect(page.locator('[data-answer-submit]')).toBeEnabled();

	await page.getByRole('button', { name: 'Replay scene' }).click();
	const replayedStage = page.locator('[data-scene-stage]');
	await expect(replayedStage).toBeVisible();
	await expect(replayedStage).toHaveAttribute('data-scene-replay', '1');
	await expect(page.getByText("You'll be asked about it.", { exact: true })).toBeVisible();
	await expect(page.locator('[data-answer-submit]')).toBeDisabled();
	await expect(replayedStage.locator('[data-scene-event]')).toHaveCount(4);
	await expect
		.poll(() =>
			replayedStage.locator('.watch-clock').evaluate((clock) => clock.getAnimations()[0].currentTime)
		)
		.toBeLessThan(2_000);
});

test('the impatient reader preserves controls and unlocks them after reading', async ({ page }) => {
	test.setTimeout(60_000);
	const q = await questionNumber(page, 'patience-claim');
	await page.goto(`/?q=${q}`);
	await page.locator('input[type="range"]').fill('1');
	await expect(page.locator('[data-answer-submit]')).toBeEnabled();
	await page.locator('[data-answer-submit]').click({ force: true });
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));

	const content = page.locator('.fast-content');
	await expect(content).toBeVisible();
	await expect(content.locator('[data-answer-id]').first()).toBeVisible();
	await expect(content).toHaveAttribute('inert', '');
	await expect(content).not.toHaveAttribute('inert', '', { timeout: 15_000 });
	await expect(content.locator('[data-answer-id]').first()).toBeEnabled();
	const options = content.locator('[data-reader-option]');
	await expect(options).toHaveCount(2);
	await expect(options.nth(0)).toHaveAttribute('data-reader-number', '1');
	await expect(options.nth(1)).toHaveAttribute('data-reader-number', '2');
	// Firefox reports the unresolved attr() expression from getComputedStyle,
	// while Chromium/WebKit report its rendered value. Both represent the same
	// generated numeric label; the numbered data attribute is asserted above.
	expect(
		await options.nth(0).evaluate((element) => getComputedStyle(element, '::after').content)
	).toMatch(/^("1"|attr\(data-reader-number\))$/);
	await expect(options.nth(0).locator('[data-reader-label]')).toHaveCSS('visibility', 'hidden');

	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.delivery).toBe('fast');
	expect(attempt.readyAt).not.toBeNull();

	// Finish the short patience chapter. The fast reader resumes per question,
	// but the chapter-ending interlude must render normally.
	await content.locator('input[type="range"]').fill('1');
	await content.locator('[data-answer-submit]').click({ force: true });
	await expect(page).toHaveURL(/\?q=26$/);

	await expect(page.locator('.fast-content')).not.toHaveAttribute('inert', '', { timeout: 15_000 });
	await page.locator('.fast-content input[type="text"]').fill('5');
	await page.locator('.fast-content [data-answer-submit]').click({ force: true });
	await expect(page).toHaveURL(/\?q=27$/);

	await expect(page.locator('.fast-content')).not.toHaveAttribute('inert', '', { timeout: 15_000 });
	await page.locator('.fast-content [data-answer-id]').first().click();
	await expect(page.locator('.fast-content [data-answer-submit]')).toBeEnabled();
	await page.locator('.fast-content [data-answer-submit]').click({ force: true });
	await expect(page).toHaveURL(/\?q=28$/);

	await expect(page.locator('.fast-content')).not.toHaveAttribute('inert', '', { timeout: 15_000 });
	await page.locator('.fast-content [data-answer-id]').first().click();
	await expect(page.locator('.fast-content [data-answer-submit]')).toBeEnabled();
	await page.locator('.fast-content [data-answer-submit]').click({ force: true });
	await expect(page).toHaveURL(/\?i=4$/);
	await expect(page.locator('.interlude')).toBeVisible();
	await expect(page.locator('.rsvp')).toHaveCount(0);
	await expect(page.locator('.fast-content')).toHaveCount(0);
});
