import { expect, test } from '@playwright/test';
import {
  expectNoAxeViolations,
  nextPinSave,
  press,
  TRACES,
} from './helpers.ts';

/**
 * The whole story, by keyboard only: find a failing request, see where it
 * failed, review the suggested cause, and record the outcome.
 */
test('from a filtered list to a resolved investigation, by keyboard', async ({
  page,
}) => {
  // 1. Which requests are failing?
  await page.goto('/traces');
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Error');
  await page.getByRole('searchbox', { name: 'Search' }).fill('checkout');
  await press(
    page.getByRole('button', { name: /^500 ms to 1 s, \d+ traces?$/ }),
  );
  await expect(page).toHaveURL(/status=error/);
  await expect(page).toHaveURL(/q=checkout/);
  await expect(page).toHaveURL(/duration=500ms-1s/);
  await expect(page.getByText(/^1 to \d+ of \d+ traces$/)).toBeVisible();

  // 2. Where inside the request does it go wrong?
  await press(page.getByRole('link', { name: 'POST /checkout' }).first());
  await expect(page).toHaveURL(new RegExp(`/traces/${TRACES.error}`));
  // The new page is announced: focus is on its heading.
  await expect(
    page.getByRole('heading', { level: 1, name: 'POST /checkout' }),
  ).toBeFocused();

  await press(page.getByRole('button', { name: 'Pin trace' }));
  await press(page.getByRole('button', { name: 'Suggest cause' }));
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(page.getByText('High confidence')).toBeVisible();

  // The claim links to the span it is based on.
  await press(
    page.getByRole('button', {
      name: 'payments: POST card-acquirer /authorize',
    }),
  );
  const evidenceRow = page.getByRole('button', {
    name: /^payments, POST card-acquirer \/authorize, 414 ms, failed, slowest span, evidence/,
  });
  await expect(evidenceRow).toBeFocused();
  await expect(evidenceRow).toHaveAttribute('aria-expanded', 'true');

  // 3. What does she tell the team?
  await press(page.getByRole('button', { name: 'Accept' }));
  await expect(page.getByText('Accepted by you')).toBeVisible();

  await press(page.getByRole('link', { name: 'Open investigation' }));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Investigation' }),
  ).toBeFocused();

  await page
    .getByRole('textbox', { name: 'Note for POST /checkout' })
    .fill('Acquirer errors from 11:50. Told #payments.');
  await press(page.getByRole('button', { name: 'Save note' }));
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  const saved = nextPinSave(page);
  await press(
    page.getByRole('button', { name: 'Mark as resolved POST /checkout' }),
    'Space',
  );
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
  await saved;
  await expectNoAxeViolations(page);

  // The record is still there after a reload.
  await page.reload();
  const card = page.getByRole('article');
  await expect(card).toContainText('The error first appears in payments');
  await expect(card).toContainText('Accepted by you');
  await expect(card).toContainText('Resolved');
  await expect(
    page.getByRole('textbox', { name: 'Note for POST /checkout' }),
  ).toHaveValue('Acquirer errors from 11:50. Told #payments.');
});
