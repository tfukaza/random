// @ts-nocheck -- development inspection hooks intentionally live on Window.
import { expect, test } from '@playwright/test';

test('a choice remains editable until the dedicated submit action', async ({ page }) => {
	// The opening birth-date control is intentionally not a pick-one question.
	await page.goto('/?q=2');
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeDisabled();

	const choices = page.locator('[data-answer-id]');
	await choices.nth(0).click();
	await choices.nth(1).click();
	await expect(page).toHaveURL(/\?q=2$/);
	await expect(submit).toBeEnabled();

	const draft = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(draft.selectionCount).toBe(2);
	expect(draft.revisionCount).toBe(1);
	expect(draft.submitAttempts).toBe(0);

	await submit.click();
	await expect(page).toHaveURL(/\?q=3$/);
	const submitted = await page.evaluate(() => window.__quizMetrics.snapshot().attempts[0]);
	expect(submitted.submitAttempts).toBe(1);
	expect(submitted.response.format).toBe('single-choice');
});

test('survey sliders require a deliberate value before submit', async ({ page }) => {
	const q = 7;
	await page.goto(`/?q=${q}`);
	const submit = page.locator('[data-answer-submit]');
	await expect(submit).toBeDisabled();
	await page.locator('input[type="range"]').fill('7');
	await expect(submit).toBeEnabled();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q}$`));
});

test('dinner allocations unwrap Svelte state without DataCloneError', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const q = 11;
	await page.goto(`/?q=${q}`);

	await page.getByRole('button', { name: 'More Venue' }).click();
	await page.getByRole('button', { name: 'More Appetizer' }).click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q}$`));
	const attempt = await page.evaluate(() => window.__quizMetrics.snapshot().attempts.at(-1));
	expect(attempt.draft.format).toBe('allocation');
	expect(attempt.draft.value).toMatchObject({ venue: 10, appetizer: 10 });
	expect(errors).not.toContain(expect.stringContaining('DataCloneError'));

	await page.locator('[data-answer-submit]').click();
	await expect(page).toHaveURL(new RegExp(`\\?q=${q + 1}$`));
});

test('the impatient reader preserves controls and unlocks them after reading', async ({ page }) => {
	test.setTimeout(60_000);
	const q = 24;
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
