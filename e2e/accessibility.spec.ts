import { expect, type Page, test } from '@playwright/test';
import {
  ACCEPTED_DECISION,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  seedPins,
  TRACES,
} from './helpers.ts';

/** A page of the app in one of its states. */
interface PageState {
  name: string;
  path: string;
  /** Pins to have in storage before the page loads. */
  pins?: Parameters<typeof seedPins>[1];
  /** Brings the page into the state to check, and waits until it is there. */
  ready: (page: Page) => Promise<void>;
}

const pinned = (traceId: string, decision: object | null = null) => [
  { traceId, status: 'open' as const, note: 'A note', decision },
];

/** Every page, in every state that looks different. */
const STATES: PageState[] = [
  {
    name: 'the traces list',
    path: '/traces',
    // The count line is there for the table and for the cards on a phone.
    ready: (page) =>
      expect(page.getByText('1 to 25 of 153 traces')).toBeVisible(),
  },
  {
    name: 'the traces list with nothing found',
    path: '/traces?q=nothing-like-this',
    ready: (page) =>
      expect(page.getByText('No traces match these filters')).toBeVisible(),
  },
  {
    name: 'the traces list with a server error',
    path: '/traces',
    ready: async (page) => {
      await page
        .getByRole('combobox', { name: 'Demo' })
        .selectOption('Server errors');
      await expect(page.getByRole('alert')).toBeVisible();
    },
  },
  {
    name: 'a trace with a span open',
    path: `/traces/${TRACES.error}?span=s10`,
    ready: (page) =>
      expect(page.getByText('414 ms, 64% of the trace')).toBeVisible(),
  },
  {
    name: 'a pinned trace with a suggestion to review',
    path: `/traces/${TRACES.uncertain}`,
    pins: pinned(TRACES.uncertain),
    ready: async (page) => {
      await page.getByRole('button', { name: 'Suggest cause' }).click();
      await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
    },
  },
  {
    name: 'a pinned trace with the cause form open',
    path: `/traces/${TRACES.slowQuery}`,
    pins: pinned(TRACES.slowQuery),
    ready: async (page) => {
      await page.getByRole('button', { name: 'Suggest cause' }).click();
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('textbox', { name: 'Cause' }).fill('');
      await page.getByRole('button', { name: 'Save cause' }).click();
      await expect(page.getByText('Write a cause, or cancel.')).toBeVisible();
    },
  },
  {
    name: 'a pinned trace with a recorded cause',
    path: `/traces/${TRACES.slowQuery}`,
    pins: pinned(TRACES.slowQuery, ACCEPTED_DECISION),
    ready: (page) => expect(page.getByText('Accepted by you')).toBeVisible(),
  },
  {
    name: 'a trace that does not exist',
    path: '/traces/does-not-exist',
    ready: (page) =>
      expect(
        page.getByRole('heading', { name: 'Trace not found' }),
      ).toBeVisible(),
  },
  {
    name: 'the Investigation page with nothing pinned',
    path: '/investigation',
    ready: (page) => expect(page.getByText('Nothing pinned yet')).toBeVisible(),
  },
  {
    name: 'the Investigation page with pins',
    path: '/investigation',
    pins: [
      ...pinned(TRACES.slowQuery, ACCEPTED_DECISION),
      { traceId: TRACES.error, status: 'resolved', note: '', decision: null },
    ],
    ready: (page) => expect(page.getByRole('article')).toHaveCount(2),
  },
  {
    name: 'the Investigation page with a note that is too long',
    path: '/investigation',
    pins: pinned(TRACES.error),
    ready: async (page) => {
      await page
        .getByRole('textbox', { name: 'Note for POST /checkout' })
        .fill('x'.repeat(501));
      await expect(
        page.getByText('The note is 1 character too long.'),
      ).toBeVisible();
    },
  },
  {
    name: 'the Design page',
    path: '/design',
    ready: (page) =>
      expect(page.getByRole('heading', { name: 'Skeleton' })).toBeVisible(),
  },
  {
    name: 'a page that does not exist',
    path: '/nope',
    ready: (page) =>
      expect(
        page.getByRole('heading', { name: 'Page not found' }),
      ).toBeVisible(),
  },
];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`axe finds nothing, ${theme} theme`, () => {
    for (const state of STATES) {
      test(state.name, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await seedPins(page, state.pins ?? []);
        await page.goto(state.path);
        await state.ready(page);
        await expectNoAxeViolations(page);
      });
    }
  });
}

test.describe('at 320 px wide, nothing scrolls sideways', () => {
  // WCAG 1.4.10 Reflow: content must work at 320 CSS px without scrolling
  // in two directions.
  for (const state of STATES) {
    test(state.name, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await seedPins(page, state.pins ?? []);
      await page.goto(state.path);
      await state.ready(page);
      await expectNoSidewaysScroll(page);
    });
  }
});

test.describe('with the keyboard', () => {
  test('the skip link is the first stop and jumps to the content', async ({
    page,
  }) => {
    await page.goto('/traces');
    await expect(page.getByRole('row')).toHaveCount(26);

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();

    // The next stop is inside the page, past the header.
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'New to traces?' }),
    ).toBeFocused();
  });

  test('every stop on the traces page shows where focus is', async ({
    page,
  }) => {
    await page.goto('/traces');
    await expect(page.getByRole('row')).toHaveCount(26);

    const seen: string[] = [];
    // Enough presses to pass the header, the filters, the chart and a few
    // rows of the table.
    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('Tab');
      const stop = await page.locator(':focus').evaluate((element) => {
        const style =
          element.ownerDocument.defaultView!.getComputedStyle(element);
        const outlined =
          style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
        const ringed = style.boxShadow !== 'none';
        return {
          name:
            element.getAttribute('aria-label') ??
            element.textContent?.trim().slice(0, 30) ??
            element.tagName,
          visible: outlined || ringed,
        };
      });
      seen.push(stop.name);
      expect(stop.visible, `no focus style on "${stop.name}"`).toBe(true);
    }
    // The walk reached the table.
    expect(seen).toContain('GET /orders');
  });

  test('a dialog keeps focus inside and gives it back when it closes', async ({
    page,
  }) => {
    await seedPins(page, pinned(TRACES.error));
    await page.goto('/investigation');
    const unpin = page.getByRole('button', { name: 'Unpin POST /checkout' });
    await unpin.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    // Focus starts on the safe choice and cannot leave the dialog.
    await expect(
      dialog.getByRole('button', { name: 'Keep it pinned' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(unpin).toBeFocused();
  });
});

test('reduced motion is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/traces');
  await expect(page.getByRole('row')).toHaveCount(26);

  // Slow responses keep the loading skeleton on screen long enough to check.
  await page
    .getByRole('combobox', { name: 'Demo' })
    .selectOption('Slow responses');
  const skeleton = page.locator('.animate-pulse').first();
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveCSS('animation-name', 'none');

  // No transition takes any real time.
  const seconds = await page
    .getByRole('button', { name: 'New to traces?' })
    .evaluate((element) =>
      parseFloat(
        element.ownerDocument.defaultView!.getComputedStyle(element)
          .transitionDuration,
      ),
    );
  expect(seconds).toBeLessThan(0.001);
});
