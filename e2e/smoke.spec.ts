import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the list opens a trace, with no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL('/traces');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Traces' }),
  ).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(26);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('link', { name: 'GET /orders' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'GET /orders' }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Spans' }).getByRole('listitem'),
  ).toHaveCount(8);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('a trace link works when opened directly', async ({ page }) => {
  await page.goto('/traces/a1b2c3d4e5f60002');
  await expect(
    page.getByRole('heading', { level: 1, name: 'POST /checkout' }),
  ).toBeVisible();
});
