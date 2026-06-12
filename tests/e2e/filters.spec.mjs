// tests/e2e/filters.spec.mjs
import { test, expect } from '@playwright/test';

test('region filter buttons render', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-group');
  const regionButtons = page.locator('#region-filters .filter-btn');
  await expect(regionButtons.first()).toHaveText('전국');
});

test('region button toggles active state on click', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-btn');
  const seoul = page.locator('#region-filters .filter-btn:has-text("서울")');
  await seoul.click();
  await expect(seoul).toHaveClass(/active/);
});

test('multiple regions can be selected', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filter-btn');
  await page.locator('#region-filters .filter-btn:has-text("서울")').click();
  await page.locator('#region-filters .filter-btn:has-text("경기")').click();
  const active = page.locator('#region-filters .filter-btn.active');
  await expect(active).toHaveCount(2);
});

test('age group filter renders', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#age-filters .filter-btn');
  const ageButtons = page.locator('#age-filters .filter-btn');
  await expect(ageButtons).toHaveCount(6);
});
