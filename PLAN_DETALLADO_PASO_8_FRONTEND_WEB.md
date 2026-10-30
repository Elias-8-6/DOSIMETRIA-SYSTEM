# Plan Detallado — Paso 8: Frontend Web (UI/UX, Escaneo Continuo y Dashboards)

## 1. Justificación y Objetivos de la Interfaz Web

El frontend web (`dosimetria_web`, en React 19 + TypeScript + TailwindCSS) debe conectar y materializar toda la lógica analítica y regulatoria implementada en los Pasos 1 a 7, permitiendo a los operadores del laboratorio, técnicos de triaje, responsables de logística y oficiales de protección radiológica operar de forma ágil y a prueba de errores humanos.

### Principios de Diseño:
1. **Ergonomía de Escaneo Continuo (Manos Libres / Pistola USB)**:
   - Los campos de código de barras deben mantener el autofoco, procesar la tecla `Enter` enviada por el lector físico de código de barras, reproducir confirmación auditiva/visual inmediata y vaciar el campo para el siguiente escaneo sin requerir clics del mouse.
2. **Defensas Visuales ISO 17025 y Minsa**:
   - Semáforos visuales explícitos: verde para condiciones conformes, amarillo/naranja para advertencias y rojo parpadeante para eventos críticos (e.g. contaminación $>0.25\ \mu\text{Sv/h}$, examen médico de POE vencido $>2$ años o dosis excesiva $>2.0\text{ mSv}$).
   - Bloqueo de operaciones no conformes con retroalimentación clara de la regla normativa violada.
3. **Inmutabilidad y No-Repudio Visible**:
   - Visualización del sello criptográfico SHA-256 en los informes y certificados técnicos, con indicador de verificación de integridad en tiempo real.

---

## 2. Arquitectura de Navegación y Páginas a Implementar

```
==================================================================================================
 PASO 8: ARQUITECTURA FRONTEND WEB (UI/UX, ESCANEO Y DASHBOARDS)
==================================================================================================
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 1. Ensamblaje y Escaneo 1:1     │  ==>  │ - /dosimeters/assembly (Holders vs Tarjetas TLD)  │
  │    (Portadosímetro / Tarjeta)   │       │ - Verificación de aptitud médica Minsa del POE   │
  └─────────────────────────────────┘       └──────────────────────────────────────────────────┘
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 2. Logística Desacoplada        │  ==>  │ - /service-orders/:id/logistics                  │
  │    (Entrega vs Devolución)      │       │ - Emisión y confirmación de Hoja de Entrega      │
  │                                 │       │ - Registro de Hoja de Devolución física          │
  └─────────────────────────────────┘       └──────────────────────────────────────────────────┘
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 3. Triaje y Cuarentena          │  ==>  │ - /receptions/:id/triage                         │
  │    Radiológica                  │       │ - Validación de detector activo (< 2 años calib) │
  │                                 │       │ - Semáforo de tasa de dosis (>0.25 µSv/h)        │
  │                                 │       │ - Tablero de cuarentena y decaimiento a 8 días   │
  └─────────────────────────────────┘       └──────────────────────────────────────────────────┘
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 4. Reportes Minsa y Alertas     │  ==>  │ - /reports (Alertas Críticas > 2.0 mSv)          │
  │    Críticas (>2.0 mSv)          │       │ - Emisión de Informe Mensual con hash SHA-256    │
  │                                 │       │ - Visor de Historial POE (50-75 años custodia)   │
  │                                 │       │ - Generador de Informe Técnico Urgente Minsa     │
  └─────────────────────────────────┘       └──────────────────────────────────────────────────┘
==================================================================================================
```

---

## 3. Detalle de Módulos y Componentes Frontend

### 3.1 Módulo API Cliente (`frontend-web/src/api/`)
1. **`reports.api.ts`**:
   - `getExcessiveDoseAlerts(query)`: Consulta lecturas con alerta $> 2.0\text{ mSv}$.
   - `generateMonthlyReport(payload)`: Emite informe mensual institucional.
   - `getWorkerHistory(workerId, params)`: Consulta historial de vida laboral POE.
   - `generateUrgentExcessiveDoseReport(payload)`: Emite informe de emergencia técnica.
   - `getOfficialReports(query)`: Lista informes emitidos.
   - `getReportById(id)`: Obtiene informe y verificación SHA-256.
2. **Actualización en `dosimeters.api.ts`**:
   - `getHolders()`, `getTldCards()`, `assembleDosimeter()`, `disassembleDosimeter()`, `findHolderByBarcode()`.
3. **Actualización en `serviceOrders.api.ts`**:
   - `createDispatchGuide()`, `confirmDispatchDelivery()`, `createReturnGuide()`, `getLogisticsSummary()`.
4. **Actualización en `receptions.api.ts`**:
   - `getSurveyMeters()`, `createSurveyMeter()`, `processTriageScan()`, `getQuarantineItems()`, `releaseQuarantineItem()`.

---

### 3.2 Vistas y Páginas Específicas

#### A. Triaje y Cuarentena Radiológica (`frontend-web/src/pages/receptions/TriageScanView.tsx`)
- Selector desplegable de detector radiológico (`SurveyMeter`).
  - Muestra fecha de última calibración. Si es $> 2\text{ años}$, resalta en rojo y bloquea el botón de escaneo.
- Input de código de barras USB del portadosímetro con captura automática.
- Input numérico de tasa de dosis ($\mu\text{Sv/h}$).
- Visualización de respuesta en tiempo real:
  - Tarjeta Verde: "LIBRE DE CONTAMINACIÓN ($D \le 0.25\ \mu\text{Sv/h}$)".
  - Tarjeta Roja: "ALERTA DE CONTAMINACIÓN ($D > 0.25\ \mu\text{Sv/h}$) — ENVIADO A CUARENTENA".
- Sección lateral / inferior de "Dosímetros en Cuarentena":
  - Tabla de dosímetros retenidos, fecha de ingreso, tasa inicial, fecha estimada de decaimiento y botón para liberación con confirmación.

#### B. Logística Desacoplada (`frontend-web/src/pages/service-orders/LogisticsView.tsx`)
- Pestaña 1: **Hoja de Entrega (Despacho a Sede Cliente)**:
  - Emisión de la guía con código correlativo.
  - Asignación de transportista / mensajero.
  - Registro de confirmación de recepción en cliente (nombre, cédula de quien recibe y fecha/hora).
- Pestaña 2: **Hoja de Devolución (Retorno al Laboratorio)**:
  - Registro independiente de la devolución física.
  - Conteo de dosímetros retornados vs. faltantes/extraviados.

#### C. Ensamblaje 1:1 de Dosímetros (`frontend-web/src/pages/dosimeters/DosimeterAssemblyView.tsx`)
- Vista de emparejamiento físico: Portadosímetro (Holder con barcode) + Tarjeta TLD (TLD Card sensible).
- Al seleccionar o escanear el trabajador asignado, muestra badge de estado médico Minsa:
  - `Apto` (verde) con fecha de vigencia del examen médico (alerta si le quedan menos de 60 días para el vencimiento bianual).
  - `Vencido` / `No Apto` (rojo): Alerta que bloquea la asignación.

#### D. Reportes Regulatorios Minsa y Alertas Críticas (`frontend-web/src/pages/reports/ReportsPage.tsx`)
- Pestaña 1: **Alertas Críticas (>2.0 mSv)**:
  - Banner centinela con conteo de alertas activas.
  - Tabla con POE, empresa, fecha, dosis profunda $Hp(10)$ y estatus de investigación.
  - Botón "Emitir Informe Urgente Minsa" que abre modal con formulario de causas, acciones correctivas y conclusión del OPR.
- Pestaña 2: **Emisión de Informes Mensuales**:
  - Selector de cliente, año y mes.
  - Resumen pre-emisión de lecturas, acumulados y dosis máxima.
  - Botón "Emitir Informe Oficial con Sello SHA-256".
- Pestaña 3: **Historial de Vida Laboral POE (50-75 años)**:
  - Selector de trabajador.
  - Tarjetas de resumen de dosis acumulada de por vida, desglose año a año y porcentaje del límite normativo consumido ($20\text{ mSv/año}$ y $100\text{ mSv/5 años}$).
- Pestaña 4: **Visor de Informes Emitidos**:
  - Lista de informes oficiales emitidos.
  - Visualización del documento oficial con sello criptográfico SHA-256 verificado en verde.

---

### 3.3 Integración en Sidebar y Enrutador
- `Sidebar.tsx`: Agregar enlace **"Reportes y Alertas"** con icono y badge rojo si hay alertas activas de dosis excesiva.
- `AppRouter.tsx`: Registrar las nuevas rutas bajo `PrivateLayout`:
  - `/reports`
  - `/dosimeters/assembly`
  - `/receptions/:id/triage`
  - `/service-orders/:id/logistics`

---

## 4. Plan de Verificación y Pruebas del Paso 8

1. **Compilación de Frontend**:
   - Ejecutar `docker exec dosimetria_web npm run build` y verificar que compile con cero errores de TypeScript y Vite.
2. **Prueba de Interfaz en Navegador**:
   - Navegación a `/reports` en `http://localhost:5173`.
   - Consulta visual de las alertas críticas existentes (> 2.0 mSv).
   - Generación de informe mensual y validación del indicador verde de hash SHA-256.
   - Verificación de la pantalla de escaneo continuo de triaje y visualización del semáforo.
