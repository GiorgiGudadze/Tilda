import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** The IDs of the three hand-written traces. */
export const TRACES = {
  slowQuery: 'a1b2c3d4e5f60001',
  error: 'a1b2c3d4e5f60002',
  uncertain: 'a1b2c3d4e5f60003',
};

export async function expectNoAxeViolations(page: Page) {
  // Let running transitions finish first. Otherwise axe can measure a
  // control halfway through a fade (a button turning from disabled grey to
  // its colour) and report a contrast that no one ever reads. Endless
  // animations (the skeleton's pulse) are skipped, as they never finish, and
  // a cancelled one counts as finished.
  await page.locator('html').evaluate((html) =>
    Promise.all(
      html.ownerDocument
        .getAnimations()
        .filter(
          (animation: {
            effect: { getTiming(): { iterations?: number } } | null;
          }) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation: { finished: Promise<unknown> }) =>
          animation.finished.catch(() => undefined),
        ),
    ),
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

/** Nothing on the page is wider than the screen. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page
    .locator('html')
    .evaluate((html) => html.scrollWidth - html.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** A decision about a trace's cause, as the mock API stores it. */
interface StoredDecision {
  traceId: string;
  decision: object;
}

/** Puts decisions in the browser's storage before the app starts. */
export async function seedDecisions(page: Page, list: StoredDecision[]) {
  await page.addInitScript((value) => {
    localStorage.setItem('trace-investigator:decisions', value);
  }, JSON.stringify(list));
}

/** The decision of a user who accepted the suggestion for the slow trace. */
export const ACCEPTED_DECISION = {
  kind: 'accepted',
  originalText:
    'Most of the time is spent in postgres: SELECT orders WHERE user_id = ?: 2.26 s of 2.90 s, not counting its child spans.',
  finalText:
    'Most of the time is spent in postgres: SELECT orders WHERE user_id = ?: 2.26 s of 2.90 s, not counting its child spans.',
  confidence: 'high',
  basis: '78% of trace time',
  evidenceSpanIds: ['s5'],
};

/** Operates a control the way a keyboard user does: focus it, press a key. */
export async function press(
  control: Locator,
  key: 'Enter' | 'Space' = 'Enter',
) {
  await control.focus();
  await control.page().keyboard.press(key);
}

/** Resolves when the next save of a decision has been answered. */
export function nextDecisionSave(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/decisions/') &&
      response.request().method() === 'PUT',
  );
}
