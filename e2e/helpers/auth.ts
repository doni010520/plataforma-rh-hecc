import { type Page, expect } from '@playwright/test';
import { testData } from './test-data';

export async function registerCompany(page: Page) {
  await page.goto('/register');
  await page.locator('#companyName').fill(testData.companyName);
  await page.locator('#name').fill(testData.adminName);
  await page.locator('#email').fill(testData.adminEmail);
  await page.locator('#password').fill(testData.password);
  await page.locator('#confirmPassword').fill(testData.password);

  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 30_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(testData.adminEmail);
  await page.locator('#password').fill(testData.password);

  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 30_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

export async function ensureLoggedIn(page: Page) {
  // Check if already logged in by trying to access dashboard
  await page.goto('/dashboard');
  const url = page.url();
  if (url.includes('/login')) {
    await loginAsAdmin(page);
  }
}
