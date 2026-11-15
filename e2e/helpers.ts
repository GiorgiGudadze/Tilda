import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** The IDs of the three hand-written traces. */
export const TRACES = {
  slowQuery: 'a1b2c3d4e5f60001',
  error: 'a1b2c3d4e5f60002',
  uncertain: 'a1b2c3d4e5f60003',
};

export async function expectNoAxeViolations(page: Page) {
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

/** A pin as the mock API stores it. */
interface StoredPin {
  traceId: string;
  status: 'open' | 'resolved';
  note: string;
  decision: object | null;
}

/** Puts pins in the browser's storage before the app starts. */
export async function seedPins(page: Page, pins: StoredPin[]) {
  await page.addInitScript((value) => {
    localStorage.setItem('trace-investigator:pins', value);
  }, JSON.stringify(pins));
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

/** Resolves when the next save of a pin has been answered. */
export function nextPinSave(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/investigation/') &&
      response.request().method() === 'PUT',
  );
}
