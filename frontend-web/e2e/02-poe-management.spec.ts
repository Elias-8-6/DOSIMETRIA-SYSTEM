import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-02: Gestión de Personal POE y Alertas Médicas (Minsa)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe navegar a la vista de Personal POE y renderizar listado y filtros', async ({ page }) => {
    await page.goto('/workers');
    await expect(page).toHaveURL(/.*workers/);

    // Encabezado normativo
    await expect(page.getByRole('heading', { name: /Personal Ocupacionalmente Expuesto/i })).toBeVisible();

    // Botón de acción principal
    const newBtn = page.getByRole('button', { name: /Nuevo Personal POE/i });
    await expect(newBtn).toBeVisible();

    // Filtros
    const searchInput = page.getByPlaceholder(/Buscar POE por nombre/i);
    await expect(searchInput).toBeVisible();

    // Tabla de datos
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Nombre' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Documento' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Ocupación' })).toBeVisible();
  });

  test('Debe abrir el modal para registrar nuevo POE con campos regulatorios', async ({ page }) => {
    await page.goto('/workers');
    const newBtn = page.getByRole('button', { name: /Nuevo Personal POE/i });
    await newBtn.click();

    // El modal debe estar visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page.getByText('Nuevo Personal POE').first()).toBeVisible();

    // Cancelar o cerrar modal
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });

  test('Debe abrir el modal de detalle para consultar historial dosimétrico', async ({ page }) => {
    await page.goto('/workers');

    // Esperar a que la tabla cargue filas
    await page.waitForSelector('tbody tr');
    const detailButtons = page.locator('tbody tr button');

    if (await detailButtons.count() > 0) {
      await detailButtons.first().click();
      // Debe abrirse modal de detalle con información del POE
      const detailModal = page.getByRole('dialog');
      await expect(detailModal).toBeVisible();

      // Cerrar modal
      const closeBtn = detailModal.getByRole('button', { name: 'Cerrar', exact: true });
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});
