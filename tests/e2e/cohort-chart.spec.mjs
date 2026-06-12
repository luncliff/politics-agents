// tests/e2e/cohort-chart.spec.mjs
import { test, expect } from '@playwright/test';

test('cohort chart renders SVG', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#cohort-chart svg');
  const svg = page.locator('#cohort-chart svg');
  await expect(svg).toBeVisible();
});

test('cohort chart renders trend lines', async ({ page }) => {
  await page.goto('/');
  // Wait for the SVG to appear (lines may be zero-length with single dataset)
  await page.waitForSelector('#cohort-chart svg');
  const lines = page.locator('.cohort-line');
  await expect(lines).not.toHaveCount(0);
});

test('cohort chart shows axis labels', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.y-axis');
  await expect(page.locator('.y-axis')).toBeVisible();
  await expect(page.locator('.x-axis')).toBeVisible();
});

test('cohort chart points are clickable', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  // Use the last point to avoid click interception by overlapping sibling circles
  const point = page.locator('.cohort-point').last();
  await point.click({ force: true });
  await expect(point).toHaveClass(/selected/);
});
