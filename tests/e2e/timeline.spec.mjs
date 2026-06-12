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

test('timeline renders election points', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const points = page.locator('.timeline-point');
  await expect(points).toHaveCount(7);
});

test('timeline highlights selected election on click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const point = page.locator('.timeline-point').nth(3);
  await point.click();
  await expect(point).toHaveClass(/active/);
});

test('timeline shows election type badge', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.timeline-point');
  const badge = page.locator('.timeline-point').nth(0).locator('.election-type');
  await expect(badge).toHaveText('대선');
});
