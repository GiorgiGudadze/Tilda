import { expect, type Page, test } from '@playwright/test';
import {
  ACCEPTED_DECISION,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  seedDecisions,
  TRACES,
} from './helpers.ts';

/** A page of the app in one of its states. */
interface PageState {
  name: string;
  path: string;
  /** Decisions to have in storage before the page loads. */
  decisions?: Parameters<typeof seedDecisions>[1];
  /** Brings the page into the state to check, and waits until it is there. */
  ready: (page: Page) => Promise<void>;
}

/** A stored decision about one trace's suggested cause. */
const decided = (traceId: string, decision: object) => [{ traceId, decision }];

/** Every page, in every state that looks different. */
const STATES: PageState[] = [
  {
    name: 'the traces list',
    path: '/traces',
    // One trace is reviewed, so its marker is checked too.
    decisions: decided(TRACES.slowQuery, ACCEPTED_DECISION),
    // The count line is there for the table and for the cards on a phone.
    ready: (page) =>
      expect(page.getByText('1 to 25 of 503 traces')).toBeVisible(),
  },
  {
    name: 'the traces list with a duration max below its min',
    path: '/traces?minMs=500&maxMs=200',
    ready: async (page) => {
      await expect(
        page.getByText('No traces match these filters'),
      ).toBeVisible();
      // On a narrow screen the filters start closed behind a button.
      const open = page.getByRole('button', { name: /^Filters/ });
      if (await open.isVisible()) {
        await open.click();
      }
      await expect(
        page.getByText('The max is below the min, so nothing can match.'),
      ).toBeVisible();
    },
  },
  {
    name: 'the traces list with the Sort list open',
    path: '/traces',
    ready: async (page) => {
      await page.getByRole('button', { name: 'Sort: Newest first' }).click();
      await expect(
        page.getByRole('menuitemradio', { name: 'Slowest first' }),
      ).toBeVisible();
    },
  },
  {
    name: 'the traces list sorted by duration from its header',
    path: '/traces?sort=fastest',
    ready: (page) =>
      expect(page.getByText(/^1 to 25 of \d+ traces$/)).toBeVisible(),
  },
  {
    name: 'the traces list with two names checked and searched',
    path: '/traces?name=GET%20%2Forders&name=POST%20%2Flogin',
    ready: async (page) => {
      await expect(page.getByText(/^1 to \d+ of \d+ traces$/)).toBeVisible();
      // On a narrow screen the filters start closed behind a button.
      const open = page.getByRole('button', { name: /^Filters/ });
      if (await open.isVisible()) {
        await open.click();
      }
      await page.getByRole('searchbox', { name: 'Search names' }).fill('o');
      await expect(
        page.getByRole('button', { name: 'Clear (2)' }),
      ).toBeVisible();
    },
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
      await page.getByRole('button', { name: 'Simulate: Normal' }).click();
      await page.getByRole('menuitemradio', { name: 'Server errors' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
    },
  },
  {
    name: 'the traces list with the service list open',
    path: '/traces',
    ready: async (page) => {
      await page.getByRole('button', { name: 'Service: All services' }).click();
      await expect(page.getByRole('option', { name: 'redis' })).toBeVisible();
    },
  },
  {
    name: 'the traces list with the time range open, and a mistake in it',
    path: '/traces',
    ready: async (page) => {
      await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();
      // On a narrow screen the filters start closed behind a button.
      const open = page.getByRole('button', { name: /^Filters/ });
      if (await open.isVisible()) {
        await open.click();
      }
      await page.getByRole('button', { name: 'Time: All time' }).click();
      await page.getByRole('textbox', { name: 'From' }).fill('yesterday');
      await page.getByRole('button', { name: 'Apply time range' }).click();
      await expect(page.getByText('Enter an end.')).toBeVisible();
    },
  },
  {
    name: 'the traces list with the tooltip of a bar',
    path: '/traces?chart=volume',
    ready: async (page) => {
      await expect(page.getByText('1 to 25 of 503 traces')).toBeVisible();
      const plot = page.locator('figure .cursor-crosshair');
      const box = (await plot.boundingBox())!;
      await page.mouse.move(box.x + box.width - 4, box.y + box.height - 4);
      await expect(page.getByRole('tooltip')).toBeVisible();
    },
  },
  {
    name: 'the scatter plot with the tooltip of a mark',
    path: `/traces?chart=scatter`,
    ready: async (page) => {
      const mark = page.locator('figure a').first();
      await expect(mark).toBeAttached();
      await mark.hover({ force: true });
      await expect(page.getByRole('tooltip')).toBeVisible();
    },
  },
  {
    name: 'the traces list as a scatter plot, with a range selected',
    path: '/traces?chart=scatter&minMs=1000&maxMs=1999',
    ready: (page) => expect(page.locator('figure svg').first()).toBeVisible(),
  },
  {
    name: 'a trace with a span open',
    path: `/traces/${TRACES.error}?span=s10`,
    ready: (page) =>
      expect(page.getByText('414 ms, 64% of the trace')).toBeVisible(),
  },
  {
    name: 'a trace with a suggestion to review',
    path: `/traces/${TRACES.uncertain}`,
    ready: async (page) => {
      await page.getByRole('button', { name: 'Suggest cause' }).click();
      await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
    },
  },
  {
    name: 'a trace with the cause form open',
    path: `/traces/${TRACES.slowQuery}`,
    ready: async (page) => {
      await page.getByRole('button', { name: 'Suggest cause' }).click();
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('textbox', { name: 'Cause' }).fill('');
      await page.getByRole('button', { name: 'Save cause' }).click();
      await expect(page.getByText('Write a cause, or cancel.')).toBeVisible();
    },
  },
  {
    name: 'a trace with a recorded cause',
    path: `/traces/${TRACES.slowQuery}`,
    decisions: decided(TRACES.slowQuery, ACCEPTED_DECISION),
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
    name: 'the Services page in the health view',
    path: '/services',
    ready: async (page) => {
      await expect(
        page.getByRole('button', { name: 'Service: api-gateway' }),
      ).toBeVisible();
      await expect(page.getByText('Dependencies')).toBeVisible();
    },
  },
  {
    name: 'the Services page with the tooltip of a step',
    path: '/services?service=postgres',
    ready: async (page) => {
      await expect(page.getByText('Dependencies')).toBeVisible();
      await page.locator('[data-step]').nth(30).hover({ force: true });
      await expect(page.getByRole('tooltip')).toBeVisible();
    },
  },
  {
    name: 'the Services page for a service that does not exist',
    path: '/services?service=mainframe',
    ready: (page) =>
      expect(
        page.getByText('There is no service called mainframe'),
      ).toBeVisible(),
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
        await seedDecisions(page, state.decisions ?? []);
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
      await seedDecisions(page, state.decisions ?? []);
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
    // Enough presses to pass the header, the sidebar, the filters, the
    // chart and a few rows of the table, each a copy button and a link.
    for (let i = 0; i < 30; i++) {
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
    expect(seen).toContain('Copy trace ID');
    expect(seen).toContain('GET /orders');
  });
});

test('reduced motion is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/traces');
  await expect(page.getByRole('row')).toHaveCount(26);

  // Slow responses keep the loading skeleton on screen long enough to check.
  await page.getByRole('button', { name: 'Simulate: Normal' }).click();
  await page.getByRole('menuitemradio', { name: 'Slow responses' }).click();
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
