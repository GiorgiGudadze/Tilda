import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers.ts';

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
  await page
    .getByRole('group', { name: 'Status' })
    .getByRole('button', { name: 'Error' })
    .click();
  await page
    .getByRole('textbox', { name: 'Max duration, in milliseconds' })
    .fill('99');
  await expect(page).toHaveURL(/status=error/);
  await expect(page).toHaveURL(/maxMs=99(&|$)/);
  await expect(page).not.toHaveURL(/minMs=/);
  // The count line replaces "Updating…" once the filtered list has loaded.
  await expect(page.getByText(/^\d+ to \d+ of \d+ traces$/)).toBeVisible();
  const count = await page.getByRole('row').count();
  await expectNoAxeViolations(page);

  // The same link in a new tab shows the same list.
  const copy = await page.context().newPage();
  await copy.goto(page.url());
  await expect(
    copy
      .getByRole('group', { name: 'Status' })
      .getByRole('button', { name: 'Error' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(copy.getByRole('row')).toHaveCount(count);
  await expect(
    copy.getByRole('textbox', { name: 'Max duration, in milliseconds' }),
  ).toHaveValue('99');
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

test('a decision is kept after a reload, and marks its row in the list', async ({
  page,
}) => {
  await page.goto('/traces/a1b2c3d4e5f60002');
  // Asking stores nothing; the decision is the record.
  await page.getByRole('button', { name: 'Suggest cause' }).click();
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/decisions/') &&
      response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Suggestion rejected')).toBeVisible();
  await saved;

  await page.reload();
  await expect(page.getByText('Suggestion rejected')).toBeVisible();

  await page.getByRole('link', { name: 'Traces', exact: true }).click();
  await expect(page.getByText('Reviewed', { exact: true })).toHaveCount(1);
  await expectNoAxeViolations(page);
});

test('a suggested cause is reviewed, accepted and kept on record', async ({
  page,
}) => {
  await page.goto('/traces/a1b2c3d4e5f60001');
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
      response.url().includes('/api/decisions/') &&
      response.request().method() === 'PUT' &&
      (response.request().postData() ?? '').includes('accepted'),
  );
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Accepted by you')).toBeVisible();
  await saved;
  await expectNoAxeViolations(page);

  // The cause is still there after a reload, labelled as a person's decision.
  await page.reload();
  const cause = page.getByRole('region', { name: 'Cause' });
  await expect(cause).toContainText('Most of the time is spent in postgres');
  await expect(cause).toContainText('Accepted by you');
  await expect(cause).toContainText('High confidence');
  await expectNoAxeViolations(page);
});

test('an unsure suggestion can be replaced by the user, on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/traces/a1b2c3d4e5f60003');
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

test('dragging across the chart zooms in, and Back zooms out', async ({
  page,
}) => {
  await page.goto('/traces?chart=volume');
  await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();

  const plot = page.locator('figure .cursor-crosshair');
  const box = (await plot.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.6, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 5 });
  await page.mouse.up();

  // The demo's clock is the page load, so the zoomed range is a real time
  // from the last day, whatever today is.
  await expect(page).toHaveURL(/from=\d{4}-\d\d-\d\d/);
  await expect(page.getByText('1 to 25 of 503 traces')).toBeHidden();
  await expect(
    page.getByRole('button', { name: /^Time: \d{1,2} [A-Z][a-z]{2}, / }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/from=/);
  await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Time: All time' }),
  ).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`a trace ID shows in full on hover, ${theme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/traces');
    await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();
    // The chart comes in after the list and pushes it down. Pointing before
    // then would point at whatever moves under the pointer.
    await expect(page.getByRole('figure')).toBeVisible();

    const row = page.getByRole('row').nth(1);
    const copy = row.getByRole('button', { name: 'Copy trace ID' });
    // The full ID and the button sit on a layer, out of sight until pointed at.
    const layer = copy.locator('..');
    await expect(layer).toHaveCSS('opacity', '0');

    // The short ID itself: the rest of its cell belongs to the row's link.
    await row.getByRole('cell').first().locator(':scope > span').hover();
    await expect(layer).toHaveCSS('opacity', '1');
    await copy.hover();
    await expect(page.getByRole('tooltip')).toHaveText('Copy trace ID');
    await expectNoAxeViolations(page);
  });
}

test('the copy button copies the trace ID, and the click stays there', async ({
  page,
}) => {
  // Reading the real clipboard back can hang in a headless browser, so the
  // page notes what it was asked to copy instead. Scripts are strings here,
  // as the end-to-end tests are typed without the browser's types.
  await page.addInitScript(`
    window.copied = [];
    navigator.clipboard.writeText = async (text) => {
      window.copied.push(text);
    };
  `);
  await page.goto('/traces');
  await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();
  await expect(page.getByRole('figure')).toBeVisible();

  const row = page.getByRole('row').nth(1);
  const href = await row.getByRole('link').getAttribute('href');
  await row.getByRole('cell').first().locator(':scope > span').hover();
  await row.getByRole('button', { name: 'Copy trace ID' }).click();

  await expect(page.getByRole('tooltip')).toHaveText('Copied');
  expect(await page.evaluate('window.copied')).toEqual([
    href!.replace('/traces/', ''),
  ]);
  // It copies; it does not open the trace under it.
  await expect(page).toHaveURL(/\/traces$/);
});

test('a service leads to its callers and its traces', async ({ page }) => {
  await page.goto('/services?service=postgres');
  await expect(
    page.getByRole('link', { name: 'Traces through postgres' }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  // A caller opens its own page, with the same time range.
  await page.getByRole('button', { name: 'Time: All time' }).click();
  await page.getByRole('option', { name: 'Last 24 hours' }).click();
  await expect(page).toHaveURL(/from=now-24h/);
  await page.getByRole('link', { name: 'orders' }).first().click();
  await expect(page).toHaveURL(/service=orders/);
  await expect(page).toHaveURL(/from=now-24h/);

  // And from there to the traces that go through it.
  await page.getByRole('link', { name: 'Traces through orders' }).click();
  await expect(page).toHaveURL(/\/traces\?.*service=orders/);
  await expect(
    page.getByRole('button', { name: 'Service: orders' }),
  ).toBeVisible();
  await expect(page.getByText(/^1 to \d+ of \d+ traces$/)).toBeVisible();
});
