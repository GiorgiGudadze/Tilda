import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test('the list opens a trace, with no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL('/traces');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Traces' }),
  ).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(26);
  await expectNoAxeViolations(page);

  await page.getByRole('link', { name: 'GET /orders' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'GET /orders' }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Spans' }).getByRole('listitem'),
  ).toHaveCount(8);
  await expectNoAxeViolations(page);
});

test('a trace link works when opened directly', async ({ page }) => {
  await page.goto('/traces/a1b2c3d4e5f60002');
  await expect(
    page.getByRole('heading', { level: 1, name: 'POST /checkout' }),
  ).toBeVisible();
});

test('the design page shows both themes with no accessibility violations', async ({
  page,
}) => {
  await page.goto('/traces');
  await page.getByRole('link', { name: 'Design' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Design' }),
  ).toBeVisible();
  // Every component is on this page in the light and the dark theme, so this
  // one check covers the contrast of both.
  await expectNoAxeViolations(page);
});

test('the theme choice is kept after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/traces');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('row')).toHaveCount(26);
  await expectNoAxeViolations(page);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(
    page.getByRole('button', { name: 'Switch to light theme' }),
  ).toBeVisible();
});

test('the theme follows the system setting until the user chooses', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/traces');
  await expect(page.locator('html')).toHaveClass(/dark/);
});
