import { expect, type Page, test } from '@playwright/test';
import { ACCEPTED_DECISION, seedDecisions, TRACES } from './helpers.ts';

/**
 * The cursor of every visible control that is pressed to act: buttons,
 * choices in a list and selects. Disabled ones are left out.
 */
async function cursors(page: Page) {
  return page
    .locator(
      'button:not(:disabled), [role="button"], [role="option"], [role="menuitemradio"], select:not(:disabled)',
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        })
        .filter((element) => element.getAttribute('aria-disabled') !== 'true')
        .map((element) => ({
          name: (
            element.getAttribute('aria-label') ??
            element.textContent ??
            element.tagName
          )
            .trim()
            .slice(0, 40),
          cursor:
            element.ownerDocument.defaultView?.getComputedStyle(element)
              .cursor ?? '',
        })),
    );
}

async function expectPointerOnEveryButton(page: Page) {
  const found = await cursors(page);
  expect(found.length).toBeGreaterThan(0);
  expect(found.filter((item) => item.cursor !== 'pointer')).toEqual([]);
}

test('every button, choice and select shows the pointer cursor', async ({
  page,
}) => {
  await seedDecisions(page, [
    { traceId: TRACES.slowQuery, decision: ACCEPTED_DECISION },
  ]);

  await page.goto('/traces');
  await expect(page.getByText(/^1 to 25 of \d+ traces$/)).toBeVisible();
  await expectPointerOnEveryButton(page);

  // The choices of the service list.
  await page.getByRole('button', { name: 'Service: All services' }).click();
  await expect(page.getByRole('option', { name: 'redis' })).toBeVisible();
  await expectPointerOnEveryButton(page);
  await page.keyboard.press('Escape');

  // The choices of the Sort list.
  await page.getByRole('button', { name: 'Sort: Newest first' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Slowest first' }),
  ).toBeVisible();
  await expectPointerOnEveryButton(page);
  await page.keyboard.press('Escape');

  await page.goto(`/traces/${TRACES.slowQuery}?span=s5`);
  await expect(page.getByText('Accepted by you')).toBeVisible();
  await expectPointerOnEveryButton(page);

  await page.goto('/services');
  await expect(page.getByText('Dependencies')).toBeVisible();
  await expectPointerOnEveryButton(page);

  await page.goto('/design');
  await expect(page.getByRole('heading', { name: 'Skeleton' })).toBeVisible();
  await expectPointerOnEveryButton(page);
});

/** The cursor drawn at the centre of a box, whatever element is on top. */
async function cursorAt(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
) {
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  return page.locator('html').evaluate(
    (html, [px, py]) => {
      const top = html.ownerDocument.elementFromPoint(px!, py!);
      return top
        ? (html.ownerDocument.defaultView?.getComputedStyle(top).cursor ?? '')
        : '';
    },
    [x, y],
  );
}

test('a whole table row opens its trace, and shows the pointer', async ({
  page,
}) => {
  await page.goto('/traces');
  await expect(page.getByText(/^1 to 25 of \d+ traces$/)).toBeVisible();
  const row = page.getByRole('row').nth(1);
  const request = await row.getByRole('link').textContent();
  // The Spans cell has no link of its own.
  const spans = row.getByRole('cell').nth(4);
  const box = await spans.boundingBox();

  expect(await cursorAt(page, box!)).toBe('pointer');

  // The row is clicked where its Spans cell is. Clicking the cell itself
  // would not work: Playwright sees that the stretched link covers it,
  // which is the point. The position is inside the row and measured again
  // at the click, so a late shift in the list cannot hit another row.
  const rowBox = await row.boundingBox();
  await row.click({
    position: {
      x: box!.x - rowBox!.x + box!.width / 2,
      y: box!.y - rowBox!.y + box!.height / 2,
    },
  });

  await expect(
    page.getByRole('heading', { level: 1, name: request! }),
  ).toBeVisible();
});

test('a whole card opens its trace on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/traces');
  await expect(page.getByText(/^1 to 25 of \d+ traces$/)).toBeVisible();
  const card = page.getByRole('listitem').first();
  const request = await card.getByRole('link').textContent();
  const box = await card.boundingBox();

  // The bottom line of the card, away from the link itself.
  await card.click({ position: { x: box!.width / 2, y: box!.height - 10 } });

  await expect(
    page.getByRole('heading', { level: 1, name: request! }),
  ).toBeVisible();
});
