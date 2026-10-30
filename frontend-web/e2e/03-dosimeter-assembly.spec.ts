import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-03: Modelado Físico Modular 1:1 de Dosímetros', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe cargar la vista de ensamblaje 1:1 sin crashear al recargar', async ({ page }) => {
    await page.goto('/dosimeters/assembly');
    await expect(page).toHaveURL(/.*dosimeters\/assembly/);

    // Encabezado principal
    await expect(
      page.getByRole('heading', { name: /Ensamblaje Físico/i })
    ).toBeVisible();

    // Recarga de la página (verificación contra regresión 'holders.map is not a function')
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Ensamblaje Físico/i })
    ).toBeVisible();

    // Módulos físicos desacoplados
    await expect(page.getByText(/1\. Portadosímetro/i)).toBeVisible();
    await expect(page.getByText(/2\. Tarjeta TLD Sensible/i)).toBeVisible();
    await expect(page.getByText(/3\. Validación de Aptitud Médica/i)).toBeVisible();

    // Botón de ensamblaje
    const submitBtn = page.getByRole('button', { name: /Ensamblar Dosímetro Modular/i });
    await expect(submitBtn).toBeVisible();
  });

  test('Debe permitir retornar a la vista principal de Dosímetros', async ({ page }) => {
    await page.goto('/dosimeters/assembly');
    const backBtn = page.getByText(/← Volver a Dosímetros/i);
    await backBtn.click();

    await page.waitForURL('**/dosimeters');
    await expect(page).toHaveURL(/.*dosimeters$/);
    await expect(page.getByRole('heading', { name: 'Dosímetros' }).first()).toBeVisible();
  });
});
