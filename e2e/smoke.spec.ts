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

test('filters live in the URL, so a filtered list can be shared', async ({
  page,
}) => {
  await page.goto('/traces');
  await page.getByRole('combobox', { name: 'Status' }).selectOption('Error');
  await page
    .getByRole('button', { name: /^Under 100 ms, \d+ traces$/ })
    .click();
  await expect(page).toHaveURL(/status=error/);
  await expect(page).toHaveURL(/duration=under-100ms/);
  // The count line replaces "Updating…" once the filtered list has loaded.
  await expect(page.getByText(/^\d+ to \d+ of \d+ traces$/)).toBeVisible();
  const count = await page.getByRole('row').count();
  await expectNoAxeViolations(page);

  // The same link in a new tab shows the same list.
  const copy = await page.context().newPage();
  await copy.goto(page.url());
  await expect(copy.getByRole('combobox', { name: 'Status' })).toHaveValue(
    'error',
  );
  await expect(copy.getByRole('row')).toHaveCount(count);
  await expect(
    copy.getByRole('button', { name: /^Under 100 ms, \d+ traces$/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('a phone gets cards and the page still fits the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/traces');
  await expect(page.getByRole('listitem')).toHaveCount(25);
  await expect(page.getByRole('table')).toHaveCount(0);
  // Nothing is wider than the screen.
  const overflow = await page
    .locator('html')
    .evaluate((html) => html.scrollWidth - html.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'New to traces?' }).click();
  await expect(page.getByText('Think of a parcel')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('a span opens its details, and the link to it can be shared', async ({
  page,
}) => {
  await page.goto('/traces/a1b2c3d4e5f60001');
  const row = page.getByRole('button', {
    name: 'postgres, SELECT orders WHERE user_id = ?, 2.26 s, OK, slowest span',
  });
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('2.26 s, 78% of the trace')).toBeVisible();
  await expect(page).toHaveURL(/span=s5/);
  await expectNoAxeViolations(page);

  const copy = await page.context().newPage();
  await copy.goto(page.url());
  await expect(copy.getByText('2.26 s, 78% of the trace')).toBeVisible();
});

test('the waterfall fits a phone, in the dark theme too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/traces/a1b2c3d4e5f60002?span=s10');
  await expect(page.getByText('414 ms, 64% of the trace')).toBeVisible();
  const overflow = await page
    .locator('html')
    .evaluate((html) => html.scrollWidth - html.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});

test('a pinned trace is kept on the Investigation page with its note', async ({
  page,
}) => {
  await page.goto('/traces/a1b2c3d4e5f60002');
  await page.getByRole('button', { name: 'Pin trace' }).click();
  await expect(page.getByText('Pinned', { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('link', { name: 'Open investigation' }).click();
  await page
    .getByRole('textbox', { name: 'Note for POST /checkout' })
    .fill('Acquirer timeouts since 11:50.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  // "Resolved" shows before the server answers, so wait for the answer too.
  // A reload before it would lose the change.
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/investigation/') &&
      response.request().method() === 'PUT',
  );
  await page
    .getByRole('button', { name: 'Mark as resolved POST /checkout' })
    .click();
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
  await saved;
  await expectNoAxeViolations(page);

  // The pin, its note and its status survive a reload.
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Note for POST /checkout' }),
  ).toHaveValue('Acquirer timeouts since 11:50.');
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();

  // The list marks the pinned trace.
  await page.getByRole('link', { name: 'Traces', exact: true }).click();
  await expect(page.getByText('Pinned', { exact: true })).toHaveCount(1);

  // Unpinning asks first, because the note would be lost.
  await page.getByRole('link', { name: 'Investigation' }).click();
  await page.getByRole('button', { name: 'Unpin POST /checkout' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Unpin and delete' }).click();
  await expect(page.getByText('Nothing pinned yet')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('a suggested cause is reviewed, accepted and kept on record', async ({
  page,
}) => {
  await page.goto('/traces/a1b2c3d4e5f60001');
  await page.getByRole('button', { name: 'Pin trace' }).click();
  await page.getByRole('button', { name: 'Suggest cause' }).click();

  // The text arrives in pieces. It can be decided on once it is complete.
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(page.getByText('High confidence')).toBeVisible();
  await expect(page.getByText('Based on: 78% of trace time')).toBeVisible();
  await expectNoAxeViolations(page);

  // The claim links to the span it is based on.
  await page
    .getByRole('button', { name: 'postgres: SELECT orders WHERE user_id = ?' })
    .click();
  await expect(page).toHaveURL(/span=s5/);
  await expect(page.getByText('2.26 s, 78% of the trace')).toBeVisible();

  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/investigation/') &&
      response.request().method() === 'PUT' &&
      (response.request().postData() ?? '').includes('accepted'),
  );
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Accepted by you')).toBeVisible();
  await saved;
  await expectNoAxeViolations(page);

  // The cause is on the Investigation page, labelled as a person's decision.
  await page.getByRole('link', { name: 'Open investigation' }).click();
  const card = page.getByRole('article');
  await expect(card).toContainText('Most of the time is spent in postgres');
  await expect(card).toContainText('Accepted by you');
  await expect(card).toContainText('High confidence');
  await expectNoAxeViolations(page);
});

test('an unsure suggestion can be replaced by the user, on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/traces/a1b2c3d4e5f60003');
  await page.getByRole('button', { name: 'Pin trace' }).click();
  await page.getByRole('button', { name: 'Suggest cause' }).click();
  await expect(page.getByText('Low confidence')).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Edit' }).click();
  await page
    .getByRole('textbox', { name: 'Cause' })
    .fill('The search cache was cold after the deploy.');
  await page.getByRole('button', { name: 'Save cause' }).click();
  await expect(page.getByText('Edited by you')).toBeVisible();

  await page.getByRole('button', { name: 'View original AI text' }).click();
  await expect(page.getByText('No single span stands out.')).toBeVisible();
  const overflow = await page
    .locator('html')
    .evaluate((html) => html.scrollWidth - html.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});
