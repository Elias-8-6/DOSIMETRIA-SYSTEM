# Plan Maestro de Pruebas de Integración y Validación del Sistema Dosimétrico

## 1. Objetivo y Alcance

Este plan define los casos de prueba de integración (E2E y entre módulos) para verificar el funcionamiento integral, la robustez y el cumplimiento normativo (Minsa / ISO 17025) del sistema `DOSIMETRIA-SYSTEM` tras la culminación de los 8 pasos de desarrollo.

```
==================================================================================================
 FLUJO INTEGRAL A VALIDAR (CICLO DE VIDA COMPLETO DEL DOSÍMETRO)
==================================================================================================
 [1. POE Minsa]         [2. Ensamblaje 1:1]       [3. Logística Desacoplada]    [4. Triaje Radiológico]
 Apto vs Vencido   ==>   Portadosímetro (Holder) ==> Hoja de Entrega / Despacho ==> Detector Calibrado
 (> 2 años bloq.)        + Tarjeta TLD            Confirmación en Cliente       Contaminación >0.25 µSv/h
                                                  Hoja de Devolución            (Cuarentena 8 días)
                                                                                       │
 ┌─────────────────────────────────────────────────────────────────────────────────────┘
 ▼
 [5. Ingesta TLD Python]       [6. Alertas Críticas]        [7. Reportes Minsa & ISO 17025]
 WinREMC / Parser CICAM   ==>  Dosis > 2.0 mSv         ==>  Informe Mensual + Correlativo
 Cálculo nC -> mSv             Apertura de Incidente        Sello Criptográfico SHA-256
 Resta Dosímetro Viajero       Expediente Urgente OPR       Historial POE (50-75 años custodia)
==================================================================================================
```

---

## 2. Batería de Casos de Prueba de Integración

### Caso 1: Reglas de Aptitud Médica del POE (Normativa Minsa)
- **Objetivo**: Verificar que el sistema bloquee la asignación de dosímetros a trabajadores cuyo examen médico bianual esté vencido o en condición no apta.
- **Acciones**:
  1. Consultar el endpoint de alertas médicas: `GET /api/v1/workers/alerts/medical`.
  2. Intentar asignar un dosímetro a un trabajador con examen médico vencido (`minsa_exam_expiry_date < now()`).
  3. Intentar asignar un dosímetro reservado para control (`CONTROL_ENVIO_VIAJERO` o `CONTROL_CALIBRACION`) a un trabajador.
- **Resultado Esperado**:
  - Respuesta HTTP `409 Conflict` con mensaje claro de bloqueo normativo.
  - La asignación a un trabajador apto con examen vigente procede con HTTP `201/200`.

---

### Caso 2: Modelado Físico Modular 1:1 y Escaneo Barcode
- **Objetivo**: Verificar la separación física entre el Portadosímetro (Holder con barcode USB) y la Tarjeta TLD (TLD Card sensible).
- **Acciones**:
  1. Crear un Holder (`POST /api/v1/dosimeters/holders`) y una TLD Card (`POST /api/v1/dosimeters/tld-cards`).
  2. Ensamblar el par (`POST /api/v1/dosimeters/assemble`).
  3. Intentar ensamblar una segunda tarjeta en el mismo holder, o el mismo holder con otra tarjeta activa.
  4. Realizar búsqueda de alta velocidad por código de barras: `GET /api/v1/dosimeters/holders/barcode/:barcode`.
  5. Desensamblar el dosímetro (`POST /api/v1/dosimeters/disassemble`).
- **Resultado Esperado**:
  - Restricción de base de datos activa: Rechazo inmediato de ensamble duplicado (índice único condicional `is_active=true`).
  - La búsqueda por barcode retorna los datos en menos de 50 ms.
  - El desensamblaje desactiva el ensamble y retorna ambos componentes a estado disponible.

---

### Caso 3: Desacoplamiento Logístico (Entrega vs. Devolución)
- **Objetivo**: Comprobar que la Hoja de Entrega y la Hoja de Devolución operan como documentos físicos independientes.
- **Acciones**:
  1. Crear una Hoja de Entrega (`POST /api/v1/service-orders/:id/dispatch-guide`) con datos del courier.
  2. Registrar la confirmación de recepción en cliente (`PATCH .../confirm`) indicando nombre y cédula del receptor en sede.
  3. Crear una Hoja de Devolución física (`POST /api/v1/service-orders/:id/return-guide`) indicando la cantidad de dosímetros retornados.
  4. Consultar el resumen logístico (`GET /api/v1/service-orders/:id/logistics-summary`).
- **Resultado Esperado**:
  - Estado de la guía de entrega cambia a `ENTREGADO` con auditoría de fecha y receptor.
  - El resumen logístico refleja el balance exacto de dosímetros enviados, devueltos y pendientes.

---

### Caso 4: Triaje Radiológico y Cuarentena (ISO 17025)
- **Objetivo**: Validar la barrera de seguridad radiológica previa al ingreso de dosímetros al laboratorio.
- **Acciones**:
  1. Intentar registrar triaje utilizando un detector con calibración mayor a 2 años.
  2. Registrar triaje con detector vigente y tasa de dosis normal ($\le 0.25\ \mu\text{Sv/h}$).
  3. Registrar triaje con tasa de dosis contaminada ($> 0.25\ \mu\text{Sv/h}$, e.g. $1.85\ \mu\text{Sv/h}$).
  4. Consultar dosímetros en cuarentena (`GET /api/v1/receptions/triage/quarantine`).
  5. Ejecutar la liberación de cuarentena (`PATCH .../release`).
- **Resultado Esperado**:
  - Rechazo estricto con HTTP `400` ante detector fuera de calibración bienal.
  - Tasa normal marca el dosímetro como libre de contaminación.
  - Tasa elevada aísla automáticamente el dosímetro en celda de cuarentena, calcula la fecha estimada de decaimiento (8 días) y genera un expediente en `incident_reports`.

---

### Caso 5: Ingesta Automática TLD Python y Algoritmo CICAM
- **Objetivo**: Validar el procesamiento de archivos crudos del lector TLD (WinREMC), conversión matemática de nC a mSv y deducción del dosímetro viajero.
- **Acciones**:
  1. Ejecutar el script `integration-tld/ucr_cicam_algorithm.py` sobre una muestra con lectura normal y lectura $> 2.0\text{ mSv}$.
  2. Ejecutar la ingesta HTTP (`POST /api/v1/readings/ingest`) con el batch calculado.
  3. Reenviar el mismo batch para validar idempotencia.
- **Resultado Esperado**:
  - Cálculo matemático exacto de $Hp(10)$ y $Hp(0.07)$ con sustracción del valor de fondo del dosímetro viajero.
  - La lectura $> 2.0\text{ mSv}$ activa `is_alert_excessive_dose = true` y crea un incidente crítico en `incident_reports`.
  - El reintento idéntico es ignorado por detección de hash SHA-256 en auditoría.

---

### Caso 6: Alertas Críticas (>2.0 mSv) y Reportes Regulatorios Minsa
- **Objetivo**: Validar la generación del Informe Mensual institucional, el Historial POE de 50-75 años y el sellado criptográfico SHA-256.
- **Acciones**:
  1. Consultar alertas activas: `GET /api/v1/reports/alerts/excessive-dose`.
  2. Emitir Informe Urgente de Dosis Excesiva (`POST /api/v1/reports/urgent-excessive-dose`).
  3. Emitir Informe Mensual por Cliente (`POST /api/v1/reports/monthly`).
  4. Consultar Historial Laboral POE (`GET /api/v1/reports/worker/:id/history`).
  5. Consultar y verificar el informe emitido (`GET /api/v1/reports/:id`).
- **Resultado Esperado**:
  - El informe urgente enlaza al trabajador, empresa, dosis medida y medidas correctivas del OPR.
  - El informe mensual genera un correlativo único anual (`INF-MINSA-2026-XXXXX`) y persiste el hash SHA-256 inmutable.
  - El historial de vida laboral POE desglosa los acumulados anuales y porcentajes de límites normativos ($20\text{ mSv/año}$ y $100\text{ mSv/5 años}$).
  - La verificación criptográfica valida `is_authentic: true`.

---

### Caso 7: Experiencia de Usuario y Reactividad Frontend Web
- **Objetivo**: Comprobar que la interfaz web visualiza adecuadamente todos los estados y semáforos.
- **Acciones**:
  1. Verificar que `/reports` muestre el banner rojo centinela ante alertas críticas y permita navegar por las 4 pestañas.
  2. Probar la pantalla de triaje `/receptions/:id/triage` verificando el autofoco del campo de código de barras.
  3. Probar la pantalla de logística `/service-orders/:id/logistics` verificando la confirmación de entrega en cliente.
  4. Probar la vista de ensamblaje `/dosimeters/assembly` con el semáforo de aptitud médica del trabajador.
- **Resultado Esperado**:
  - Cero errores en consola de JavaScript y reactividad fluida en TailwindCSS.

---

## 3. Plan de Ejecución Automatizado

Para ejecutar estas pruebas de manera reproducible y desatendida, crearemos un script de automatización en Python (`scripts/integration_test_suite.py` o en scratch) que:
1. Autentique un usuario con rol de Administrador / Director Técnico.
2. Ejecute secuencialmente los 6 casos de prueba del backend interactuando con la API REST (`http://localhost:3000/api/v1`).
3. Emita un informe final consolidado de validación con el estado de cada prueba (`PASS` / `FAIL`).
