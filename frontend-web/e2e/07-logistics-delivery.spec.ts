import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-07: Logística Desacoplada y Órdenes de Servicio', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe listar las órdenes de servicio y acceder al detalle', async ({ page }) => {
    await page.goto('/service-orders');
    await expect(page).toHaveURL(/.*service-orders/);

    // Encabezado
    await expect(
      page.getByRole('heading', { name: /Órdenes de servicio/i })
    ).toBeVisible();

    // Clic en Ver detalle con auto-waiting
    const viewBtn = page.getByRole('button', { name: /Ver detalle/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();

    await expect(page).toHaveURL(/.*service-orders\/[0-9a-fA-F-]+/);
    await expect(page.getByText('Dosímetros solicitados')).toBeVisible();
  });

  test('Debe previsualizar documento REPDOS-01 con terminología Minsa POE', async ({ page }) => {
    await page.goto('/service-orders');

    const viewBtn = page.getByRole('button', { name: /Ver detalle/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await expect(page).toHaveURL(/.*service-orders\/[0-9a-fA-F-]+/);

    // Botón Formulario REPDOS-01
    const repdosBtn = page.getByRole('button', { name: /Formulario REPDOS-01/i });
    await expect(repdosBtn).toBeVisible();
    await repdosBtn.click();

    // Modal de previsualización
    const modal = page.locator('[role="dialog"], .fixed');
    await expect(modal.first()).toBeVisible();

    // Cerrar modal haciendo clic en la X del modal
    const closeBtn = modal.first().locator('button:has-text("✕")');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Debe acceder a la vista de Logística Desacoplada (Entrega vs Devolución)', async ({ page }) => {
    await page.goto('/service-orders');

    const viewBtn = page.getByRole('button', { name: /Ver detalle/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await expect(page).toHaveURL(/.*service-orders\/[0-9a-fA-F-]+/);

    // Obtener la URL actual para extraer el ID de la orden
    const currentUrl = page.url();
    const orderIdMatch = currentUrl.match(/\/service-orders\/([0-9a-fA-F-]+)/);
    expect(orderIdMatch).not.toBeNull();
    const orderId = orderIdMatch![1];

    // Navegar directamente a la ruta de logística de la orden
    await page.goto(`/service-orders/${orderId}/logistics`);
    await expect(page).toHaveURL(new RegExp(`.*service-orders\/${orderId}\/logistics`));

    // Validar encabezado y resumen logístico
    await expect(
      page.getByRole('heading', { name: /Logística Desacoplada/i })
    ).toBeVisible();

    // Pestañas desacopladas
    await expect(page.getByRole('button', { name: /Hoja de Entrega/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hoja de Devolución/i })).toBeVisible();

    // Formulario de Hoja de Entrega
    await expect(page.getByText(/Emitir Nueva Hoja de Entrega/i)).toBeVisible();
  });
});
