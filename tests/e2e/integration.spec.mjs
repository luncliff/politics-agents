// tests/e2e/integration.spec.mjs
import { test, expect } from '@playwright/test';

test('full flow: load → filter → click point → detail → add event → explainer', async ({ page }) => {
  await page.goto('/');

  // Timeline loads with 7 points
  await page.waitForSelector('.timeline-point');
  await expect(page.locator('.timeline-point')).toHaveCount(7);

  // Chart renders (lines may have degenerate geometry with a single dataset; wait for attached)
  await page.waitForSelector('.cohort-line', { state: 'attached' });

  // Change region filter
  await page.locator('#region-filters .filter-btn:has-text("서울")').click();
  await expect(page.locator('#region-filters .filter-btn:has-text("서울")')).toHaveClass(/active/);

  // Click a chart point
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').last().click({ force: true });
  await expect(page.locator('#detail-panel')).toBeVisible();

  // Close detail panel
  await page.locator('.detail-close').click();
  await expect(page.locator('#detail-panel')).toBeHidden();

  // Add an event marker
  await page.locator('.event-add-btn').click();
  await page.locator('.event-date-input').fill('2021-12-01');
  await page.locator('.event-name-input').fill('테스트 사건');
  await page.locator('.event-submit-btn').click();
  await expect(page.locator('.event-marker-label').first()).toHaveText('테스트 사건');

  // Toggle explainer
  await page.locator('#explainer-toggle').click();
  await expect(page.locator('#explainer-section')).toBeVisible();
});

test('dashboard has no images without alt text', async ({ page }) => {
  await page.goto('/');
  const imgsWithoutAlt = page.locator('img:not([alt])');
  await expect(imgsWithoutAlt).toHaveCount(0);
});
