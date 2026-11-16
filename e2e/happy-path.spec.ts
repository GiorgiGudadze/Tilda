import { expect, test } from '@playwright/test';
import {
  expectNoAxeViolations,
  nextDecisionSave,
  press,
  TRACES,
} from './helpers.ts';

/**
 * The whole story, by keyboard only: find a failing request, see where it
 * failed, review the suggested cause, and record the outcome.
 */
test('from a filtered list to a recorded cause, by keyboard', async ({
  page,
}) => {
  // 1. Which requests are failing?
  await page.goto('/traces');
  await press(
    page
      .getByRole('group', { name: 'Status' })
      .getByRole('button', { name: 'Error' }),
  );
  await page
    .getByRole('searchbox', { name: 'Search', exact: true })
    .fill('checkout');
  await page
    .getByRole('textbox', { name: 'Min duration, in milliseconds' })
    .focus();
  await page.keyboard.type('500');
  await page.keyboard.press('Tab');
  await page.keyboard.type('999');
  await expect(page).toHaveURL(/status=error/);
  await expect(page).toHaveURL(/q=checkout/);
  // Both ends are included: 500 to 999 ms.
  await expect(page).toHaveURL(/minMs=500/);
  await expect(page).toHaveURL(/maxMs=999/);
  await expect(page.getByText(/^1 to \d+ of \d+ traces$/)).toBeVisible();

  // 2. Where inside the request does it go wrong?
  await press(page.getByRole('link', { name: 'POST /checkout' }).first());
  await expect(page).toHaveURL(new RegExp(`/traces/${TRACES.error}`));
  // The new page is announced: focus is on its heading.
  await expect(
    page.getByRole('heading', { level: 1, name: 'POST /checkout' }),
  ).toBeFocused();

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

  // 3. What does she tell the team? The decision is the record.
  const saved = nextDecisionSave(page);
  await press(page.getByRole('button', { name: 'Accept' }));
  await expect(page.getByText('Accepted by you')).toBeVisible();
  await saved;
  await expectNoAxeViolations(page);

  // The record is still there after a reload, and the list marks the trace.
  await page.reload();
  await expect(page.getByText('Accepted by you')).toBeVisible();
  await expect(
    page.getByText('The error first appears in payments'),
  ).toBeVisible();
  await press(page.getByRole('link', { name: 'Back to traces' }));
  await expect(page.getByText('Reviewed', { exact: true })).toHaveCount(1);
});
