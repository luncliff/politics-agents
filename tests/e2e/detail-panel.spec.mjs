// tests/e2e/detail-panel.spec.mjs
import { test, expect } from '@playwright/test';

test('detail panel is hidden by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#detail-panel')).toBeHidden();
});

test('detail panel shows on cohort point click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').last().click({ force: true });
  await expect(page.locator('#detail-panel')).toBeVisible();
});

test('detail panel shows heatmap grid', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').last().click({ force: true });
  await expect(page.locator('.detail-heatmap')).toBeVisible();
});

test('detail panel shows numeric summary', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').last().click({ force: true });
  await expect(page.locator('.detail-summary')).toBeVisible();
});

test('detail panel can be closed', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cohort-point');
  await page.locator('.cohort-point').last().click({ force: true });
  await expect(page.locator('#detail-panel')).toBeVisible();
  await page.locator('.detail-close').click();
  await expect(page.locator('#detail-panel')).toBeHidden();
});
