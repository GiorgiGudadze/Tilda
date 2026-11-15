import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the app loads and has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Trace Investigator' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
