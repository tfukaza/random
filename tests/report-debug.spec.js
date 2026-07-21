import { expect, test } from '@playwright/test';

test('report debug parameter opens a populated report directly', async ({ page }) => {
	await page.goto('/?report=1');

	await expect(page).toHaveURL(/\?report=1$/);
	await expect(page.getByText('Temperament profile')).toBeVisible();
	await expect(page.getByText('Extrovert')).toHaveClass(/won/);
	await expect(page.getByText('Cautious')).toHaveClass(/won/);
	await expect(page.getByRole('button', { name: 'Take it again' })).toBeVisible();
});

test('AstroTurf debug report renders the exceptional override', async ({ page }) => {
	await page.goto('/?report=astroturf');

	await expect(page).toHaveURL(/\?report=astroturf$/);
	await expect(page.getByText('Type ASTROTURF')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'AstroTurf' })).toBeVisible();
	await expect(page.getByText('ChemGrass')).toBeVisible();
	await expect(page.locator('.plate img')).toHaveAttribute(
		'src',
		'/images/report-overrides/astroturf-field.jpg'
	);
});
