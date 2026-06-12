import { test, expect } from '@playwright/test';

test('page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('선거 시각화 대시보드');
  await expect(page.locator('#app-header h1')).toHaveText('선거 시각화 대시보드');
});

test('main sections exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#timeline-section')).toBeVisible();
  await expect(page.locator('#filters-section')).toBeVisible();
  await expect(page.locator('#cohort-chart')).toBeVisible();
});
