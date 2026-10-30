import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-06: Reportes Regulatorios Minsa e Integridad Criptográfica SHA-256', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe cargar el módulo de Reportes Regulatorios con sus 4 pestañas operativas', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/.*reports/);

    // Encabezado
    await expect(
      page.getByRole('heading', { name: /Reportes Regulatorios Minsa e ISO 17025/i })
    ).toBeVisible();

    // Pestañas
    await expect(page.getByRole('button', { name: /Alertas Críticas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Emitir Informe Mensual/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Historial POE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Archivo Oficial/i })).toBeVisible();
  });

  test('Debe consultar el Historial de Vida Laboral de un POE (50-75 años)', async ({ page }) => {
    await page.goto('/reports');

    // Cambiar a la pestaña de Historial POE
    const historyTab = page.getByRole('button', { name: /Historial POE/i });
    await historyTab.click();

    await expect(page.getByText(/Seleccionar Personal POE/i)).toBeVisible();

    // Seleccionar POE y consultar
    const fetchBtn = page.getByRole('button', { name: /Consultar Historial \(50-75 Años\)/i });
    await expect(fetchBtn).toBeVisible();
    await fetchBtn.click();

    // Esperar datos del historial acumulado
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Dosis Total Vida Laboral/i)).toBeVisible();
  });

  test('Debe revisar el Archivo Oficial de Informes y constatar los sellos SHA-256', async ({ page }) => {
    await page.goto('/reports');

    // Cambiar a la pestaña de Archivo Oficial
    const archiveTab = page.getByRole('button', { name: /Archivo Oficial/i });
    await archiveTab.click();

    // Verificar encabezados de la tabla de informes oficiales
    await expect(page.locator('th').filter({ hasText: 'Número Oficial' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Sello SHA-256' })).toBeVisible();

    // Comprobar que existen informes oficiales emitidos
    await page.waitForSelector('tbody tr');
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText('INF-');

    // Clic en Ver Detalle de informe
    const detailBtn = page.getByRole('button', { name: /Ver Detalle/i }).first();
    await detailBtn.click();

    // Debe abrirse modal de previsualización con certificación digital
    const modal = page.locator('.fixed');
    await expect(modal.first()).toBeVisible();
    await expect(page.getByText(/SELLO SHA-256 VÁLIDO/i)).toBeVisible();
  });
});
