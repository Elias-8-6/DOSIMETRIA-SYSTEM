import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-04: Recepción y Triaje Radiológico (ISO 17025)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe listar las recepciones de laboratorio y navegar al detalle', async ({ page }) => {
    await page.goto('/receptions');
    await expect(page).toHaveURL(/.*receptions/);

    // Encabezado
    await expect(page.getByRole('heading', { name: /Triaje/i }).first()).toBeVisible();

    // Tabla de recepciones
    await page.waitForSelector('tbody tr');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Clic en Ver Detalle de la primera recepción
    const detailBtn = page.getByRole('button', { name: /Ver Detalle/i }).first();
    await detailBtn.click();

    await expect(page).toHaveURL(/.*receptions\/[0-9a-fA-F-]+/);
    await expect(page.getByRole('heading', { name: /Triaje REC|Datos Generales/i }).first()).toBeVisible();
  });

  test('Debe acceder a la vista de Triaje Radiológico y verificar equipos de medición', async ({ page }) => {
    await page.goto('/receptions');
    await page.waitForSelector('tbody tr');

    const detailBtn = page.getByRole('button', { name: /Ver Detalle/i }).first();
    await detailBtn.click();
    await expect(page).toHaveURL(/.*receptions\/[0-9a-fA-F-]+/);

    // Clic en botón Triaje Radiológico
    const triageBtn = page.getByRole('button', { name: /Triaje Radiológico/i });
    await expect(triageBtn).toBeVisible({ timeout: 5000 });
    await triageBtn.click();

    await expect(page).toHaveURL(/.*receptions\/[0-9a-fA-F-]+\/triage/);

    // Título de la vista de Triaje
    await expect(
      page.getByRole('heading', { name: /Triaje de Contaminación Superficial/i })
    ).toBeVisible();

    // Selectores de detector de radiación y tasa de dosis
    await expect(page.getByText(/1\. Detector Radiológico/i)).toBeVisible();
    await expect(page.getByText(/2\. Escaneo Continuo/i)).toBeVisible();

    // Campo de tasa de dosis
    const doseRateInput = page.locator('input[type="number"]');
    await expect(doseRateInput).toBeVisible();
  });
});
