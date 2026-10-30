# Plan Detallado — Paso 7: Motor de Alertas Críticas (>2.0 mSv) y Reportes Regulatorios Minsa

## 1. Contexto Normativo y Justificación Técnica

### 1.1 Normativa Minsa y Protección Radiológica
- **Límite Ocupacional**: Según el reglamento de protección radiológica nacional (Minsa / autoridad reguladora), el límite anual de dosis efectiva para el Personal Ocupacionalmente Expuesto (POE) es de **20 mSv/año** (o 100 mSv en 5 años consecutivos, sin exceder 50 mSv en un único año).
- **Criterio de Alerta Crítica Mensual**: Una dosis acumulada mensual superior a **2.0 mSv** (10% del límite anual en un solo mes) es un evento centinela que exige:
  1. Activación inmediata de alerta crítica en el sistema.
  2. Apertura automática de expediente de investigación técnica (`incident_reports` con severidad `'critica'` y tipo `'dosis_elevada'`).
  3. Generación de una notificación oficial e Informe Técnico de Dosis Excesiva para el Oficial de Protección Radiológica (OPR) y comunicación al cliente y a la autoridad competente.
- **Trazabilidad Inalterable (50 a 75 años)**:
  - Las lecturas y los informes dosimétricos emitidos tienen valor legal y deben conservarse durante toda la vida laboral del POE y al menos 30 años después de su retiro (hasta 75 años de edad).
  - Los informes emitidos deben contar con correlativo institucional inmutable y firma criptográfica (SHA-256) garantizando que no puedan ser alterados retroactivamente (ISO/IEC 17025:2017 Cláusula 7.8 y 8.4).

---

## 2. Alcance de la Implementación (Paso 7)

```
==================================================================================================
 PASO 7: MOTOR DE ALERTAS CRÍTICAS (>2.0 mSv) Y GENERACIÓN DE INFORMES REGULATORIOS MINSA
==================================================================================================
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 1. Alertas de Dosis Excesiva    │  ==>  │ - Registro automático en incident_reports        │
  │    (> 2.0 mSv)                  │       │ - Endpoints de consulta y gestión de incidentes  │
  └─────────────────────────────────┘       │ - Notificación de protocolo de investigación     │
                                            └──────────────────────────────────────────────────┘
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 2. Motor de Reportes Minsa      │  ==>  │ - Informe Dosimétrico Mensual (Empresa / POE)    │
  │    (ISO 17025)                  │       │ - Informe Trimestral y Anual Consolidado         │
  └─────────────────────────────────┘       │ - Historial Laboral POE (50-75 años)             │
                                            │ - Informe Urgente de Dosis Crítica (>2.0 mSv)    │
                                            └──────────────────────────────────────────────────┘
  ┌─────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
  │ 3. Integridad y Correlativo     │  ==>  │ - Tabla official_reports (correlativo único)     │
  │    Criptográfico                │       │ - Hash SHA-256 de integridad del reporte emitido │
  └─────────────────────────────────┘       │ - Formato exportable JSON estructurado / HTML    │
==================================================================================================
```

---

## 3. Arquitectura de Base de Datos y Nuevas Estructuras

### 3.1 Tabla `official_reports` (Informes Oficiales Emitidos)
Para garantizar la inmutabilidad y la trazabilidad de 50 a 75 años exigida por ISO 17025 y Minsa:
```sql
CREATE TABLE IF NOT EXISTS official_reports (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES organizations (id),
  client_id           uuid NOT NULL REFERENCES clients (id),
  service_order_id    uuid REFERENCES service_orders (id),
  report_number       text UNIQUE NOT NULL, -- Ej: INF-MINSA-2026-0001
  report_type         text NOT NULL CHECK (report_type IN (
                        'MENSUAL_CLIENTE',
                        'CONSOLIDADO_ANUAL',
                        'HISTORIAL_POE',
                        'URGENTE_DOSIS_EXCESIVA'
                      )),
  period_year         int NOT NULL,
  period_month        int, -- 1-12 (null para anual)
  issued_at           timestamptz NOT NULL DEFAULT now(),
  issued_by           uuid NOT NULL REFERENCES users (id),
  content_data        jsonb NOT NULL, -- Datos estructurados completos del informe
  integrity_hash      text NOT NULL, -- SHA-256 del content_data canonical
  status              text NOT NULL DEFAULT 'EMITIDO' CHECK (status IN ('EMITIDO', 'ANULADO')),
  voided_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Correlativo secuencial anual por organización
CREATE SEQUENCE IF NOT EXISTS seq_official_report_number START 1;
```

---

## 4. Diseño del Módulo Backend (`backend/src/reports/`)

### 4.1 Estructura de Directorios
```
backend/src/reports/
├── dto/
│   ├── generate-monthly-report.dto.ts
│   ├── generate-worker-history.dto.ts
│   ├── generate-excessive-dose-report.dto.ts
│   └── query-reports.dto.ts
├── use-cases/
│   ├── generate-monthly-report.use-case.ts
│   ├── generate-worker-history.use-case.ts
│   ├── generate-urgent-excessive-dose-report.use-case.ts
│   ├── find-official-reports.use-case.ts
│   └── get-report-by-id.use-case.ts
├── alerts/
│   ├── excessive-dose-alerts.service.ts
│   └── dto/query-excessive-dose-alerts.dto.ts
├── reports.controller.ts
├── reports.service.ts
└── reports.module.ts
```

### 4.2 Endpoints a Exponer
| Método | Ruta | Roles Permitidos | Propósito |
|---|---|---|---|
| `GET` | `/api/v1/reports/alerts/excessive-dose` | `ADMIN`, `DIRECTOR_TECNICO`, `OFICIAL_PROTECCION_RADIOLOGICA`, `ENCARGADO_PROTECCION_RADIOLOGICA` | Lista de lecturas con alerta de dosis excesiva (>2.0 mSv) y sus incidentes |
| `POST` | `/api/v1/reports/monthly` | `ADMIN`, `DIRECTOR_TECNICO`, `RESPONSABLE_DOSIMETRIA` | Genera y emite Informe Mensual por Cliente con correlativo e integridad |
| `GET` | `/api/v1/reports/worker/:workerId/history` | `ADMIN`, `DIRECTOR_TECNICO`, `OFICIAL_PROTECCION_RADIOLOGICA`, `ENCARGADO_PROTECCION_RADIOLOGICA`, `LECTOR_REGULATORIO` | Historial acumulado de vida laboral del POE (50-75 años) |
| `POST` | `/api/v1/reports/urgent-excessive-dose` | `ADMIN`, `DIRECTOR_TECNICO`, `OFICIAL_PROTECCION_RADIOLOGICA` | Genera el informe técnico de emergencia Minsa para una lectura crítica |
| `GET` | `/api/v1/reports` | Todos los roles autorizados | Consulta de informes emitidos por cliente, año y tipo |
| `GET` | `/api/v1/reports/:id` | Todos los roles autorizados | Obtiene el informe completo y verifica su hash SHA-256 de integridad |

---

## 5. Modelado del Contenido del Informe Minsa (JSON Estructurado)

Cada informe emitido en `content_data` contiene:
1. **Encabezado Institucional**:
   - Razón Social del Laboratorio: *Laboratorio de Dosimetría Personal UTP*.
   - Acreditación: *ISO/IEC 17025:2017*.
   - Código correlativo del informe: `INF-MINSA-2026-XXXXX`.
   - Fecha y hora de emisión.
2. **Datos del Cliente y Servicio**:
   - Cliente: Nombre, RUC, Dirección.
   - Práctica Radiológica: Dental, Radiología Médica, etc.
   - EPR del cliente y teléfono/contacto.
   - Orden de Servicio asociada y periodo de vigilancia (e.g. `2026-10`).
3. **Parámetros Metrológicos ISO 17025**:
   - Lector TLD empleado y código de equipo.
   - Fuente de calibración: Sr-90 / Y-90 con fecha de calibración y factor de respuesta.
   - Límite de Detección del Sistema (LOD): `0.10 mSv`.
   - Valor del Dosímetro Viajero / Fondo sustraído.
4. **Tabla de Resultados por POE**:
   - DNI / Cédula, Nombres y Apellidos, Cargo / Área.
   - Código de Portadosímetro (Holder) y Tarjeta TLD.
   - Dosis profunda $Hp(10)$ [mSv] y superficial $Hp(0.07)$ [mSv].
   - Dosis neta del periodo actual.
   - Dosis acumulada en el año calendario en curso.
   - Condición médica: Apto (vigente hasta fecha).
   - Estado de la lectura: Normal o **ALERTA CRÍTICA (>2.0 mSv)**.
5. **Declaración de Conformidad y Cláusula de Validez Legal**:
   - Cláusula de no-repudio ISO 17025.
   - Firma del Responsable de Dosimetría y Oficial de Protección Radiológica.
   - Hash SHA-256 generado sobre el cuerpo del informe.

---

## 6. Plan de Verificación y Pruebas

1. **Creación de la tabla `official_reports` y secuencia**:
   - Ejecutar script SQL en la base de datos de Supabase local.
2. **Prueba Unitaria de Generación de Informes**:
   - Generar Informe Mensual para un cliente con órdenes procesadas.
   - Verificar cálculo de correlativo `INF-MINSA-2026-0001` y cálculo correcto de sumas acumuladas de dosis.
   - Verificar hash SHA-256 persistido.
3. **Prueba de Alerta Crítica**:
   - Consultar `/api/v1/reports/alerts/excessive-dose` verificando que la lectura crítica generada en el Paso 6 (2.635 mSv) figure activa y con su expediente de incidente.
   - Generar Informe de Emergencia Urgente Minsa sobre esa lectura.
4. **Verificación de Compilación y Salud de Contenedores**:
   - Docker restart de `dosimetria_backend`.
   - Mapeo de rutas verificado en logs de NestJS.
