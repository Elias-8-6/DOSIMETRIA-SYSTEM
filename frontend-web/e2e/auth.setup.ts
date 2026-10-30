import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.resolve(__dirname, '../playwright/.auth/user.json');

setup('Autenticar como Administrador / OPR', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@laboratorio.com');
  await page.fill('#password', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await expect(page).toHaveURL(/.*dashboard/);

  await page.context().storageState({ path: authFile });
});
