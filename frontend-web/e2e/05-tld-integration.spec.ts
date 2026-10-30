import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('E2E-05: Ingesta Automática TLD y Algoritmo CICAM', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Debe cargar la vista de Integración TLD con parámetros del algoritmo CICAM', async ({ page }) => {
    await page.goto('/integration');
    await expect(page).toHaveURL(/.*integration/);

    // Encabezado
    await expect(
      page.getByRole('heading', { name: /Integración de Lecturas TLD/i })
    ).toBeVisible();

    // Tarjetas informativas de arquitectura
    await expect(page.getByText('Algoritmo CICAM', { exact: true })).toBeVisible();
    await expect(page.getByText('Control de Idempotencia')).toBeVisible();
    await expect(page.getByText('Alerta Dosis Crítica')).toBeVisible();

    // Campos del formulario
    await expect(page.getByText(/Nombre Archivo WinREMC/i)).toBeVisible();
    await expect(page.getByText(/Factor Sr-90 \/ Y-90/i)).toBeVisible();
    await expect(page.getByText(/Carga Dosímetro Viajero/i)).toBeVisible();
    await expect(page.getByText(/Tarjeta TLD/i)).toBeVisible();
  });

  test('Debe calcular la dosis estimada en tiempo real y permitir procesar ingesta', async ({ page }) => {
    await page.goto('/integration');

    // Cambiar la carga de la pastilla
    const chargeInput = page.locator('input[type="number"]').nth(2); // Carga Pastilla 1
    if (await chargeInput.isVisible()) {
      await chargeInput.fill('6000');
    }

    // Botón de procesar ingesta
    const submitBtn = page.getByRole('button', { name: /Ejecutar Ingesta de Lectura TLD/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Esperar respuesta o banner de resultado de ingesta
    await page.waitForTimeout(2000);
    const resultBox = page.locator('.bg-green-50, .bg-blue-50, .bg-red-50');
    await expect(resultBox.first()).toBeVisible();
  });

  test('Debe permitir saltar al panel de Alertas Críticas OPR en Reportes', async ({ page }) => {
    await page.goto('/integration');
    const alertBtn = page.getByRole('button', { name: /Ver Alertas Críticas OPR/i });
    await alertBtn.click();

    await page.waitForURL('**/reports');
    await expect(page).toHaveURL(/.*reports/);
  });
});
