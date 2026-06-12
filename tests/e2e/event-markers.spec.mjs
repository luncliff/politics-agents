// tests/e2e/event-markers.spec.mjs
import { test, expect } from '@playwright/test';

test('event add button is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.event-add-btn')).toBeVisible();
});

test('clicking add shows the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await expect(page.locator('.event-form')).toBeVisible();
});

test('submitting event adds a marker label', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await page.locator('.event-date-input').fill('2020-03-01');
  await page.locator('.event-name-input').fill('코로나19');
  await page.locator('.event-submit-btn').click();
  await expect(page.locator('.event-marker-label').first()).toHaveText('코로나19');
});

test('cancel hides the form', async ({ page }) => {
  await page.goto('/');
  await page.locator('.event-add-btn').click();
  await page.locator('.event-cancel-btn').click();
  await expect(page.locator('.event-form')).toBeHidden();
});
