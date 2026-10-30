import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
  }
  await expect(page).toHaveURL(/.*dashboard/);
}
