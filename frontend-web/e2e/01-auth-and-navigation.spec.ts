import { test, expect } from '@playwright/test';

test.describe('E2E-01: Autenticación, RBAC y Consistencia de Terminología', () => {
  test('Debe mostrar error con credenciales incorrectas', async ({ browser }) => {
    // Usar contexto aislado sin sesión previa
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sistema de Dosimetría');

    await page.fill('#email', 'invalido@dosimetria.com');
    await page.fill('#password', 'claveErronea123');
    await page.click('button[type="submit"]');

    // Debe mostrar banner o texto de error
    const errorBox = page.locator('.bg-red-50');
    await expect(errorBox).toBeVisible();

    await context.close();
  });

  test('Debe mostrar terminología normativa en Sidebar en sesión autenticada', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // Verificación de Terminología Oficial en Sidebar
    // 1. Personal de Laboratorio (Antes "Usuarios")
    await expect(page.locator('nav')).toContainText('Personal de Laboratorio');

    // 2. Personal POE (Antes "Trabajadores")
    await expect(page.locator('nav')).toContainText('Personal POE');

    // 3. Dosímetros y Ensamblaje
    await expect(page.locator('nav')).toContainText('Dosímetros');
    await expect(page.locator('nav')).toContainText('Ensamblaje');

    // 4. Integración TLD
    await expect(page.locator('nav')).toContainText('Integración TLD');

    // 5. Reportes Minsa y Alertas
    await expect(page.locator('nav')).toContainText('Reportes Minsa y Alertas');
  });
});
