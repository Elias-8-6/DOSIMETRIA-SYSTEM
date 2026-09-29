# CASOS DE USO Y DIAGRAMAS DE FLUJO — SISTEMA DE DOSIMETRÍA ISO/IEC 17025

> **Instrucciones para Gemini:** Este documento contiene todos los casos de uso implementados y los diagramas de flujo del Sistema de Trazabilidad de Dosimetría Ocupacional ISO/IEC 17025. Por favor, genera ilustraciones profesionales de cada diagrama descrito. Cada sección incluye: (1) Descripción del caso de uso, (2) Actores involucrados, (3) Precondiciones y postcondiciones, (4) Flujo paso a paso, y (5) Diagrama de flujo en texto que debes convertir a una ilustración visual clara y profesional.

---

## ÍNDICE DE CASOS DE USO

| # | Módulo | Caso de Uso | Estado |
|---|--------|-------------|--------|
| CU-01 | Autenticación | Inicio de Sesión Segura | ✅ Implementado |
| CU-02 | Autenticación | Renovación Automática de Sesión | ✅ Implementado |
| CU-03 | Autenticación | Cierre de Sesión | ✅ Implementado |
| CU-04 | Perfil | Gestión del Perfil de Usuario | ✅ Implementado |
| CU-05 | Perfil | Cambio de Contraseña | ✅ Implementado |
| CU-06 | Usuarios | Gestión de Usuarios del Sistema | ✅ Implementado |
| CU-07 | Usuarios | Administración de Permisos Granulares | ✅ Implementado |
| CU-08 | Clientes | Gestión de Instituciones Cliente | ✅ Implementado |
| CU-09 | Clientes | Gestión de Sedes/Ubicaciones del Cliente | ✅ Implementado |
| CU-10 | Trabajadores | Gestión de Trabajadores Expuestos (TOE) | ✅ Implementado |
| CU-11 | Dosímetros | Alta de Dosímetro en Inventario | ✅ Implementado |
| CU-12 | Dosímetros | Asignación de Dosímetro a Trabajador | ✅ Implementado |
| CU-13 | Dosímetros | Devolución de Dosímetro | ✅ Implementado |
| CU-14 | Dosímetros | Cambio de Estado del Dosímetro | ✅ Implementado |
| CU-15 | Dosímetros | Consulta del Historial Integral del Dosímetro | ✅ Implementado |
| CU-16 | Órdenes | Creación de Orden de Servicio | ✅ Implementado |
| CU-17 | Órdenes | Gestión del Ciclo de Vida de la Orden | ✅ Implementado |
| CU-18 | Órdenes | Generación del Formulario REPDOS-01 | ✅ Implementado |
| CU-19 | Órdenes | Generación de Nota de Entrega | ✅ Implementado |
| CU-20 | Recepciones | Recepción e Inspección Física de Dosímetros | ✅ Implementado |
| CU-21 | Recepciones | Consulta del Acta de Recepción | ✅ Implementado |

---

## CU-01: INICIO DE SESIÓN SEGURA

**Actores:** Usuario del Sistema (Técnico, Administrador, Dosimetrista, Coordinador, Auditor)

**Descripción:** El usuario se autentica en el sistema proporcionando su correo electrónico y contraseña. El sistema valida las credenciales contra la base de datos, genera un par de tokens JWT (access + refresh) y los almacena en cookies httpOnly seguras. En ningún momento se almacenan tokens en el navegador (localStorage/sessionStorage).

**Precondiciones:**
- El usuario debe tener una cuenta activa en el sistema (status = 'active').
- El usuario no debe estar autenticado previamente.

**Postcondiciones:**
- Se establece una sesión segura con cookies httpOnly.
- El refresh token se almacena hasheado en la base de datos.
- El usuario es redirigido al Dashboard.

**Flujo paso a paso:**

```
DIAGRAMA DE FLUJO — CU-01: Inicio de Sesión

[INICIO]
    │
    ▼
[Usuario accede a /login]
    │
    ▼
[Pantalla muestra formulario con campos: Email + Contraseña]
    │
    ▼
[Usuario ingresa credenciales y presiona "Iniciar sesión"]
    │
    ▼
[Frontend envía POST /api/v1/auth/login con {email, password}]
    │
    ▼
◆ ¿Rate Limit excedido? (5 intentos/minuto)
    │ SÍ ──→ [Mostrar error: "Demasiados intentos, espere 1 minuto"] ──→ [FIN]
    │
    │ NO
    ▼
◆ ¿Existe usuario con ese email?
    │ NO ──→ [Retornar error 401: "Credenciales incorrectas"] ──→ [Mostrar error en pantalla] ──→ [FIN]
    │
    │ SÍ
    ▼
◆ ¿El usuario está activo (status = 'active')?
    │ NO ──→ [Retornar error 403: "Cuenta suspendida"] ──→ [Mostrar error en pantalla] ──→ [FIN]
    │
    │ SÍ
    ▼
[Backend compara contraseña con bcrypt.compare()]
    │
    ▼
◆ ¿Contraseña correcta?
    │ NO ──→ [Retornar error 401] ──→ [Mostrar error en pantalla] ──→ [FIN]
    │
    │ SÍ
    ▼
[Generar Access Token JWT (15 min, payload: sub, email, full_name, organization_id)]
    │
    ▼
[Generar Refresh Token JWT (7 días)]
    │
    ▼
[Hashear Refresh Token con SHA-256 y almacenarlo en tabla refresh_tokens]
    │
    ▼
[Establecer cookies httpOnly: access_token + refresh_token]
    │
    ▼
[Frontend recibe 200 OK]
    │
    ▼
[Frontend ejecuta GET /api/v1/auth/profile para cargar perfil completo]
    │
    ▼
[AuthContext almacena: user, roles[], permissions[]]
    │
    ▼
[Redirigir a /dashboard]
    │
    ▼
[FIN — Sesión establecida]
```

---

## CU-02: RENOVACIÓN AUTOMÁTICA DE SESIÓN (Token Refresh)

**Actores:** Sistema (automático, transparente al usuario)

**Descripción:** Cuando un Access Token JWT expira (15 minutos), el interceptor de Axios detecta una respuesta 401 y automáticamente intenta renovar la sesión usando el Refresh Token almacenado en la cookie httpOnly, sin interrumpir la experiencia del usuario.

**Flujo paso a paso:**

```
DIAGRAMA DE FLUJO — CU-02: Renovación Automática de Sesión

[Usuario realiza cualquier acción que llama a la API]
    │
    ▼
[Axios envía request al backend con cookie access_token]
    │
    ▼
◆ ¿El backend retorna HTTP 401 (token expirado)?
    │ NO ──→ [Procesar respuesta normalmente] ──→ [FIN]
    │
    │ SÍ
    ▼
[Interceptor de Axios captura el 401]
    │
    ▼
◆ ¿Ya hay un refresh en progreso? (evitar múltiples refreshes simultáneos)
    │ SÍ ──→ [Encolar la request original y esperar resolución] ──→ [Reintentar]
    │
    │ NO
    ▼
[Marcar refresh como "en progreso"]
    │
    ▼
[Enviar POST /api/v1/auth/refresh (cookie refresh_token)]
    │
    ▼
◆ ¿El refresh fue exitoso?
    │ NO ──→ [Limpiar estado de autenticación] ──→ [Redirigir a /login] ──→ [FIN]
    │
    │ SÍ
    ▼
[Backend genera nuevo par de tokens]
    │
    ▼
[Backend invalida el refresh token anterior (rotación)]
    │
    ▼
[Nuevas cookies httpOnly establecidas en la respuesta]
    │
    ▼
[Reintentar la request original que falló]
    │
    ▼
[Resolver todas las requests encoladas]
    │
    ▼
[FIN — Sesión renovada sin interrumpir al usuario]
```

---

## CU-03: CIERRE DE SESIÓN

**Actores:** Usuario del Sistema

**Flujo:**

```
DIAGRAMA DE FLUJO — CU-03: Cierre de Sesión

[Usuario hace clic en "Cerrar sesión" en el Sidebar]
    │
    ▼
[Frontend envía POST /api/v1/auth/logout]
    │
    ▼
[Backend invalida el refresh token en la base de datos]
    │
    ▼
[Backend limpia las cookies httpOnly (access_token + refresh_token)]
    │
    ▼
[Frontend limpia el estado del AuthContext (user = null)]
    │
    ▼
[Redirigir a /login]
    │
    ▼
[FIN]
```

---

## CU-04 y CU-05: GESTIÓN DE PERFIL Y CAMBIO DE CONTRASEÑA

**Actores:** Cualquier usuario autenticado

**Flujo:**

```
DIAGRAMA DE FLUJO — CU-04/CU-05: Perfil y Contraseña

[Usuario hace clic en su nombre en la parte inferior del Sidebar]
    │
    ▼
[Se abre el ProfileModal con los datos del perfil actual]
    │
    ├── Pestaña "Perfil":
    │   ├── Campos editables: Nombre completo, Teléfono, Ubicación, Título
    │   │   académico, Universidad, Documento de identidad, Fecha de nacimiento
    │   ├── [Guardar] → PATCH /api/v1/auth/profile
    │   └── [Se actualiza el perfil en el AuthContext]
    │
    └── Pestaña "Contraseña":
        ├── Campos: Contraseña actual, Nueva contraseña, Confirmar nueva contraseña
        ├── Validación: la nueva contraseña debe ser diferente a la actual
        ├── [Cambiar contraseña] → PATCH /api/v1/auth/password
        │       │
        │       ▼
        │   ◆ ¿Contraseña actual correcta?
        │       │ NO → [Mostrar error: "La contraseña actual es incorrecta"]
        │       │ SÍ → [Hashear nueva contraseña con bcrypt]
        │       │       → [Actualizar en base de datos]
        │       │       → [Mostrar toast: "Contraseña actualizada"]
        │       ▼
        └── [FIN]
```

---

## CU-06: GESTIÓN DE USUARIOS DEL SISTEMA

**Actores:** Administrador del Sistema (requiere permiso `users:read`, `users:create`, `users:update`)

**Descripción:** CRUD completo de usuarios del sistema (empleados del laboratorio). Incluye listado paginado con búsqueda, creación mediante modal, activación/desactivación y vista de detalle con asignación de permisos.

**Flujo de la vista de listado (/users):**

```
DIAGRAMA DE FLUJO — CU-06: Gestión de Usuarios

[Administrador navega a /users desde el Sidebar]
    │
    ▼
[Se verifica permiso users:read vía PermissionRoute]
    │
    ▼
[Cargar GET /api/v1/users?page=1&limit=10]
    │
    ▼
[Mostrar tabla con columnas: Nombre | Email | Roles | Estado | Acciones]
    │
    ├── [Buscar por nombre o email] → Debounce 300ms → Recargar con filtro
    │
    ├── [Botón "Nuevo usuario"] → Abrir CreateUserModal
    │   ├── Campos: Email*, Nombre completo*, Contraseña*, Rol
    │   ├── [Crear] → POST /api/v1/users
    │   └── [Éxito] → Toast "Usuario creado" + Recargar tabla
    │
    ├── [Clic en fila de usuario] → Navegar a /users/:id (Detalle)
    │   ├── Mostrar datos profesionales: Email, Nombre, Roles, Estado
    │   ├── Mostrar datos extendidos: Título, Universidad, Documento, etc.
    │   ├── Panel de Permisos Granulares (ver CU-07)
    │   └── [Botón Activar/Desactivar] → PATCH /api/v1/users/:id/status
    │       └── Confirmar con ConfirmDialog antes de ejecutar
    │
    └── [Paginación] → Cambiar página → Recargar datos
```

---

## CU-07: ADMINISTRACIÓN DE PERMISOS GRANULARES

**Actores:** Administrador del Sistema (requiere permiso `users:update`)

**Descripción:** En la vista de detalle de un usuario (/users/:id), el administrador puede ver y modificar en tiempo real la matriz de permisos granulares. Los permisos están organizados por módulo (users, clients, workers, dosimeters, assignments, service_orders, receptions, lab_process, readings, reports, equipment, audit) y por acción (create, read, update, delete).

**Flujo:**

```
DIAGRAMA DE FLUJO — CU-07: Permisos Granulares

[Administrador está en /users/:id]
    │
    ▼
[Cargar catálogo de permisos: GET /api/v1/permissions]
[Cargar usuario con sus permisos: GET /api/v1/users/:id]
    │
    ▼
[Mostrar matriz de permisos agrupada por módulo]
    │
    │   Para cada permiso del catálogo:
    │   ┌─────────────────────────────────────────────────┐
    │   │ Módulo        │ Create │ Read │ Update │ Delete │
    │   │───────────────│────────│──────│────────│────────│
    │   │ users         │  [✓]   │ [✓]  │  [✓]   │  [✓]  │
    │   │ clients       │  [ ]   │ [✓]  │  [ ]   │  [ ]  │
    │   │ dosimeters    │  [✓]   │ [✓]  │  [✓]   │  [ ]  │
    │   │ ...           │  ...   │ ...  │  ...   │  ...  │
    │   │ audit         │  N/A   │ [✓]  │  N/A   │  N/A  │
    │   └─────────────────────────────────────────────────┘
    │
    ▼
[Administrador hace clic en una casilla de verificación]
    │
    ▼
◆ ¿El permiso estaba concedido?
    │ SÍ → DELETE /api/v1/users/:id/permissions/:permissionId (Revocar)
    │ NO → POST /api/v1/users/:id/permissions {permission_id} (Conceder)
    │
    ▼
[Recargar permisos del usuario]
    │
    ▼
[La casilla refleja el nuevo estado inmediatamente]
    │
    ▼
[El PermissionsCacheService del backend invalidará la caché en ≤60s]
    │
    ▼
[FIN]
```

---

## CU-08: GESTIÓN DE INSTITUCIONES CLIENTE

**Actores:** Administrador / Coordinador (requiere permiso `clients:*`)

**Flujo del listado y CRUD (/clients):**

```
DIAGRAMA DE FLUJO — CU-08: Gestión de Clientes

[Usuario navega a /clients]
    │
    ▼
[Cargar GET /api/v1/clients?page=1&limit=10]
    │
    ▼
[Mostrar tabla: Código | Nombre | Tipo | Contacto | Teléfono | Estado]
    │
    ├── FILTROS disponibles:
    │   ├── Búsqueda por texto (nombre, código, contacto) — Debounce 300ms
    │   ├── Filtro por estado: Todos / Activo / Inactivo
    │   └── Filtro por tipo: Hospital / Clínica / Industria / Investigación / Gobierno / Otro
    │
    ├── [Botón "Nuevo cliente"] → Abrir ClientFormModal
    │   ├── Campos obligatorios: Nombre*, Código*, Tipo*, Contacto*, Email*
    │   ├── Campos opcionales: Teléfono, Dirección, Sitio web,
    │   │   Fecha inicio de contrato, Fecha fin de contrato
    │   ├── [Guardar] → POST /api/v1/clients
    │   └── [Éxito] → Toast "Cliente creado" + Recargar tabla
    │
    └── [Clic en fila] → Navegar a /clients/:id (ver CU-09)
```

---

## CU-09: GESTIÓN DE SEDES/UBICACIONES DEL CLIENTE

**Actores:** Administrador / Coordinador (requiere permiso `clients:read` + `clients:update`)

**Flujo del detalle del cliente (/clients/:id):**

```
DIAGRAMA DE FLUJO — CU-09: Detalle del Cliente y Gestión de Sedes

[Usuario navega a /clients/:id]
    │
    ▼
[Cargar GET /api/v1/clients/:id]
    │
    ▼
[Mostrar ficha del cliente:]
    ├── Datos generales: Nombre, Código, Tipo, Contacto, Email
    ├── Datos contractuales: Dirección, Sitio web, Teléfono
    ├── Fechas de contrato: Inicio y Fin
    ├── Estado: Badge Activo/Inactivo + Botón para cambiar estado
    │
    ▼
[Sección: Sedes / Ubicaciones Físicas]
    │
    │   Para cada sede (client_location):
    │   ┌─────────────────────────────────────────────┐
    │   │ ▶ Sede: "Torre Médica - Rayos X"           │
    │   │   Código: LOC-001                          │
    │   │   Contacto: Dr. Rodríguez · Tel: 555-1234  │
    │   │   Radiación: Rayos X                       │
    │   │   Riesgo: [■ Alto] (badge rojo)            │
    │   │   Estado: [● Activo] (badge verde)         │
    │   │   [Editar] [Activar/Desactivar]            │
    │   │                                             │
    │   │   ▼ Expandir: Lista de trabajadores en sede │
    │   └─────────────────────────────────────────────┘
    │
    ├── [Botón "Nueva sede"] → Abrir LocationFormModal
    │   ├── Campos: Nombre*, Código*, Contacto, Teléfono
    │   ├── Tipo de radiación: Rayos X / Gamma / Neutrones / Beta / Mixta / Otro
    │   ├── Nivel de riesgo: Bajo / Medio / Alto
    │   └── [Guardar] → POST /api/v1/clients/:id/locations
    │
    ├── [Botón "Editar sede"] → Abrir LocationFormModal con datos precargados
    │   └── [Guardar] → PATCH /api/v1/clients/:id/locations/:locationId
    │
    ├── [Botón Activar/Desactivar sede]
    │   └── ConfirmDialog → PATCH /api/v1/clients/:id/locations/:locationId/status
    │
    └── [Sección embebida: Trabajadores del cliente] (ver CU-10, componente WorkersPage embebido)
```

---

## CU-10: GESTIÓN DE TRABAJADORES EXPUESTOS (TOE)

**Actores:** Administrador / Coordinador / Técnico (requiere permiso `workers:*`)

**Flujo del listado (/workers):**

```
DIAGRAMA DE FLUJO — CU-10: Gestión de Trabajadores

[Usuario navega a /workers]
    │
    ▼
[Cargar GET /api/v1/workers?page=1&limit=10]
    │
    ▼
[Mostrar tabla: Nombre | Documento | Cód. Empleado | Cliente | Sede | Ocupación | Estado]
    │
    ├── FILTROS:
    │   ├── Búsqueda por texto (nombre, documento, código)
    │   ├── Filtro por estado: Activo / Inactivo
    │   ├── Filtro por cliente (selector dinámico con clientes activos)
    │   └── Filtro por sede (se filtra según el cliente seleccionado)
    │
    ├── [Botón "Nuevo trabajador"] → Abrir WorkerFormModal
    │   ├── Campos obligatorios: Nombre completo*, Documento*, Cliente*, Sede*
    │   ├── Campos opcionales: Código empleado, Sexo, Fecha nacimiento,
    │   │   Teléfono, Email, Ocupación, Fecha de inicio laboral
    │   └── [Guardar] → POST /api/v1/workers
    │
    ├── [Clic "Ver detalle"] → Abrir WorkerDetailModal
    │   ├── Sección Identificación: Documento, Código empleado
    │   ├── Sección Datos Personales: Sexo, Fecha nacimiento, Teléfono, Email
    │   ├── Sección Laboral: Ocupación, Fecha inicio, Cliente, Sede
    │   ├── Sección Historial de Dosímetros Asignados:
    │   │   ├── Para cada asignación pasada y presente:
    │   │   │   ├── Serie del dosímetro + tipo + badge de estado dosímetro
    │   │   │   ├── Badge: "En campo" (activo) o "Devuelto"
    │   │   │   ├── Fecha de asignación y devolución
    │   │   │   └── Responsable de entrega y notas
    │   ├── [Botón "Editar"] → Abrir WorkerFormModal con datos precargados
    │   └── [Botón "Activar/Desactivar"] → ConfirmDialog → PATCH /api/v1/workers/:id/status
    │
    └── [Paginación]
```

---

## CU-11: ALTA DE DOSÍMETRO EN INVENTARIO

**Actores:** Técnico de Laboratorio / Dosimetrista (requiere permiso `dosimeters:create`)

```
DIAGRAMA DE FLUJO — CU-11: Alta de Dosímetro

[Técnico navega a /dosimeters]
    │
    ▼
[Botón "Nuevo dosímetro"] → Abrir DosimeterFormModal
    │
    ▼
[Formulario con campos:]
    ├── Número de serie* (identificador físico grabado)
    ├── Código interno (código del laboratorio)
    ├── Tipo de dosímetro* (selector: TLD / OSL / Film / etc.)
    ├── Fabricante
    ├── Modelo
    ├── Número de lote de fabricación
    ├── Fecha de fabricación
    ├── Fecha de puesta en servicio (commissioning)
    ├── Condición física: Excelente / Bueno / Regular / Dañado
    ├── ¿Es reutilizable?: Sí / No
    ├── Período de uso recomendado (días)
    ├── Límite máximo de dosis (mSv)
    ├── Fecha del último recocido (annealing)
    ├── Fotografía del dosímetro (upload de imagen)
    └── Notas técnicas
    │
    ▼
[Guardar] → POST /api/v1/dosimeters
    │
    ▼
[Backend valida datos con DTOs + class-validator]
    │
    ▼
[Insertar en tabla dosimeters con estado inicial DISPONIBLE]
    │
    ▼
[AuditService.log() — Registrar evento CREATE en audit_logs]
    │
    ▼
[Toast "Dosímetro creado correctamente"]
    │
    ▼
[Recargar tabla de inventario]
    │
    ▼
[FIN]
```

---

## CU-12: ASIGNACIÓN DE DOSÍMETRO A TRABAJADOR

**Actores:** Técnico de Laboratorio (requiere permiso `assignments:create`)

**Precondiciones:** El dosímetro debe estar en estado DISPONIBLE y no tener asignación activa.

```
DIAGRAMA DE FLUJO — CU-12: Asignación de Dosímetro

[Técnico navega al detalle del dosímetro /dosimeters/:id]
    │
    ▼
◆ ¿El dosímetro está en estado DISPONIBLE y sin asignación activa?
    │ NO → [El botón "Asignar" no se muestra] → [FIN]
    │
    │ SÍ
    ▼
[Botón "Asignar" visible] → [Clic] → Abrir AssignDosimeterModal
    │
    ▼
[Formulario:]
    ├── Seleccionar trabajador* (búsqueda por nombre/documento)
    └── Notas de entrega (observaciones opcionales)
    │
    ▼
[Guardar] → POST /api/v1/dosimeters/:id/assign
    │
    ▼
[Backend crea registro en dosimeter_assignments (assigned_at = now)]
    │
    ▼
[Backend cambia estado del dosímetro a ASIGNADO]
    │
    ▼
[AuditService.log() — Evento: ASSIGNMENT + STATUS_CHANGE]
    │
    ▼
[Recargar detalle del dosímetro]
    │
    ▼
[La sección "Asignación actual" ahora muestra:]
    ├── Nombre del trabajador
    ├── Institución cliente
    ├── Sede / ubicación
    ├── Fecha de asignación
    ├── Responsable de entrega
    └── Botón "Devolver" visible
    │
    ▼
[FIN]
```

---

## CU-13: DEVOLUCIÓN DE DOSÍMETRO

**Actores:** Técnico de Laboratorio (requiere permiso `assignments:update`)

**Precondiciones:** El dosímetro debe tener una asignación activa (sin returned_at).

```
DIAGRAMA DE FLUJO — CU-13: Devolución de Dosímetro

[Técnico en /dosimeters/:id ve asignación activa]
    │
    ▼
[Clic en botón "Devolver"] → Abrir ReturnDosimeterModal
    │
    ▼
[Formulario:]
    ├── Fecha de devolución (por defecto: hoy)
    └── Notas de devolución (ej: "Dosímetro devuelto en buenas condiciones")
    │
    ▼
[Confirmar] → POST /api/v1/dosimeters/:id/return
    │
    ▼
[Backend actualiza dosimeter_assignments: returned_at = fecha, status = 'inactivo']
    │
    ▼
[Backend cambia estado del dosímetro a DISPONIBLE]
    │
    ▼
[AuditService.log() — Evento: RETURN + STATUS_CHANGE]
    │
    ▼
[Recargar detalle]
    │
    ▼
[La sección "Asignación actual" ahora dice "Sin asignación activa"]
[El historial de asignaciones muestra la asignación cerrada como "Devuelto"]
    │
    ▼
[FIN]
```

---

## CU-14: CAMBIO DE ESTADO DEL DOSÍMETRO

**Actores:** Técnico de Laboratorio (requiere permiso `dosimeters:update`)

**Máquina de Estados del Dosímetro:**

```
DIAGRAMA DE MÁQUINA DE ESTADOS — Ciclo de Vida del Dosímetro

Estado              │ Descripción                                    │ Transiciones Permitidas
────────────────────┼────────────────────────────────────────────────┼─────────────────────────────────
DISPONIBLE          │ En almacén, calibrado, listo para asignar      │ → ASIGNADO (vía CU-12)
                    │                                                │ → EN_PROCESO, CALIBRACION, DE_BAJA
ASIGNADO            │ En poder de un trabajador en campo              │ → DEVOLUCION (solo vía CU-13)
                    │ (NO se puede cambiar manualmente a ASIGNADO)    │
DEVOLUCION          │ Retornado por el cliente, pendiente inspección  │ → EN_PROCESO, DISPONIBLE
EN_PROCESO          │ En laboratorio para lectura/recocido/limpieza  │ → DISPONIBLE, CALIBRACION, DE_BAJA
CALIBRACION         │ Verificación metrológica en irradiador         │ → DISPONIBLE, EN_PROCESO, DE_BAJA
DE_BAJA             │ Retirado permanentemente del servicio           │ (estado terminal)

Reglas de negocio:
• Estado ASIGNADO: Solo se alcanza mediante la acción "Asignar" (CU-12). El selector manual lo muestra deshabilitado con "(Vía Asignar)".
• Estado DISPONIBLE con asignación activa: Bloqueado. Muestra advertencia: "Registre su devolución primero".
```

**Flujo en la UI:**

```
DIAGRAMA DE FLUJO — CU-14: Cambio de Estado

[Técnico en /dosimeters/:id]
    │
    ▼
[Panel "Cambiar estado" con selector dropdown]
    │
    ├── Opción ASIGNADO: deshabilitada, indica "(Vía Asignar)"
    ├── Si hay asignación activa: opción DISPONIBLE deshabilitada,
    │   se muestra mensaje de advertencia amarillo:
    │   "Para marcarlo como disponible, registre su devolución"
    │
    ▼
[Seleccionar nuevo estado] → [Clic "Guardar"]
    │
    ▼
◆ ¿El estado es diferente al actual y es una transición válida?
    │ NO → [Botón Guardar deshabilitado]
    │ SÍ
    ▼
[PATCH /api/v1/dosimeters/:id/status {status_code}]
    │
    ▼
[AuditService.log() — STATUS_CHANGE]
    │
    ▼
[Toast "Estado actualizado correctamente"]
    │
    ▼
[Recargar ficha del dosímetro]
    │
    ▼
[FIN]
```

---

## CU-15: CONSULTA DEL HISTORIAL INTEGRAL DEL DOSÍMETRO

**Actores:** Cualquier usuario con permiso `dosimeters:read`

```
DIAGRAMA DE FLUJO — CU-15: Historial Integral

[Usuario navega a /dosimeters/:id]
    │
    ▼
[Cargar en paralelo:]
    ├── GET /api/v1/dosimeters/:id (datos + asignación actual)
    └── GET /api/v1/dosimeters/:id/history (asignaciones, lecturas, contaminaciones)
    │
    ▼
[PESTAÑA 1: Historial de Asignaciones]
    │   Para cada asignación (ordenadas: activas primero, luego por fecha desc):
    │   ├── Nombre del trabajador + Institución + Sede
    │   ├── Badge: "En campo" (verde) / "Devuelto" (gris)
    │   ├── Fechas: Asignado el... / Devuelto el...
    │   ├── Responsable que registró
    │   └── Notas de campo
    │
[PESTAÑA 2: Lecturas de Dosis]
    │   Tabla con columnas:
    │   ├── Fecha y hora de lectura
    │   ├── Período de uso (desde - hasta)
    │   ├── Dosis medida (valor ± incertidumbre, con unidad)
    │   ├── Hp(10) en mSv / Hp(0.07) en mSv
    │   ├── Equipo lector utilizado
    │   └── Estado de validación: Válido (verde) / Sospechoso (amarillo) / Inválido (rojo)
    │
[PESTAÑA 3: Control de Contaminación]
    │   Tabla con columnas:
    │   ├── Fecha del chequeo
    │   ├── Resultado: Libre (verde) / Contaminado leve (amarillo) / Contaminado severo (rojo)
    │   ├── Valor medido (ej: 0.03 Bq/cm²)
    │   ├── Inspector responsable
    │   ├── Equipo de medición utilizado
    │   └── Observaciones de descontaminación
    │
    ▼
[FIN — Vista de consulta, no modifica datos]
```

---

## CU-16: CREACIÓN DE ORDEN DE SERVICIO

**Actores:** Coordinador de Laboratorio (requiere permiso `service_orders:create`)

**Descripción:** Flujo completo paso a paso para crear una solicitud de procesamiento de dosímetros. Es el flujo más complejo de la aplicación.

```
DIAGRAMA DE FLUJO — CU-16: Crear Orden de Servicio

[Coordinador navega a /service-orders y presiona "Nueva orden"]
    │
    ▼
[Redirige a /service-orders/new — página completa (no modal)]
    │
    ▼
═══════════════════════════════════════════
         PASO 1: DATOS DE LA ORDEN
═══════════════════════════════════════════
    │
    ▼
[Seleccionar Cliente*] → (selector con clientes activos cargados al montar la página)
    │
    ▼
[Al seleccionar cliente, automáticamente:]
    ├── Cargar dosímetros asignados a trabajadores de este cliente
    │   GET /api/v1/service-orders/client-dosimeters/:clientId
    └── Mostrar lista de "Dosímetros del cliente" como sugerencias
    │
    ▼
[Seleccionar Tipo de Servicio*:]
    ├── Lectura de dosis
    ├── Lectura y recarga
    ├── Mantenimiento
    └── Calibración
    │
    ▼
[Seleccionar Prioridad*:]
    ├── Normal
    ├── Urgente
    └── Crítica
    │
    ▼
[Fecha solicitada*] (por defecto: hoy)
[Fecha límite de entrega] (opcional)
[Observaciones] (texto libre)
    │
    ▼
═══════════════════════════════════════════
  PASO 2: SELECCIÓN DE DOSÍMETROS A PROCESAR
═══════════════════════════════════════════
    │
    ▼
[Método A: Seleccionar de la lista del cliente]
    │   Se muestran los dosímetros actualmente asignados al cliente seleccionado.
    │   Cada dosímetro muestra: Serie, Trabajador portador, Tipo
    │   [Clic "Agregar"] → Agregar al borrador de ítems con acción por defecto "lectura"
    │
[Método B: Búsqueda global por número de serie]
    │   Campo de búsqueda → GET /api/v1/service-orders/search-dosimeters?q=...
    │   Resultados muestran dosímetros de toda la organización
    │   [Seleccionar] → Agregar al borrador
    │
    ▼
[Para cada dosímetro agregado al borrador:]
    ├── Seleccionar acción requerida: Lectura / Limpieza / Recarga / Inspección
    └── [Botón "Quitar"] para remover del borrador
    │
    ▼
═══════════════════════════════════════════
           PASO 3: CONFIRMAR Y CREAR
═══════════════════════════════════════════
    │
    ▼
◆ ¿Hay al menos 1 dosímetro en el borrador?
    │ NO → [Botón "Crear orden" deshabilitado]
    │ SÍ
    ▼
[Clic "Crear orden de servicio"]
    │
    ▼
[POST /api/v1/service-orders con payload:]
    {
      client_id, service_type, priority,
      requested_date, due_date, observations,
      items: [{ dosimeter_id, requested_action }, ...]
    }
    │
    ▼
[Backend genera order_number automático (ej: SO-2026-0015)]
[Backend crea service_order_items por cada dosímetro]
[AuditService.log() — CREATE]
    │
    ▼
[Orden creada exitosamente]
    │
    ▼
═══════════════════════════════════════════
    PASO 4: PREVISUALIZACIÓN DE DOCUMENTOS
═══════════════════════════════════════════
    │
    ▼
[Se ofrecen 2 acciones post-creación:]
    │
    ├── [📄 Ver Formulario REPDOS-01] → Abre DocumentPreviewModal (ver CU-18)
    │
    └── [📦 Ver Nota de Entrega] → Abre DocumentPreviewModal (ver CU-19)
    │
    ▼
[También puede navegar a /service-orders/:id para ver el detalle]
    │
    ▼
[FIN]
```

---

## CU-17: GESTIÓN DEL CICLO DE VIDA DE LA ORDEN DE SERVICIO

**Actores:** Coordinador de Laboratorio (requiere permiso `service_orders:update` y `service_orders:delete`)

**Máquina de Estados de la Orden:**

```
DIAGRAMA DE MÁQUINA DE ESTADOS — Orden de Servicio

   [PENDING]
      │
      ▼ (Marcar como Recibida)
   [RECEIVED]
      │
      ▼ (Marcar como En Proceso)
   [IN_PROCESS]
      │
      ▼ (Enviar a Revisión QC)
   [QC_REVIEW]
      │
      ├── (Aprobar) ──→ [COMPLETED] (terminal)
      │
      └── (Rechazar / Devolver) ──→ [IN_PROCESS]

   Desde cualquier estado no terminal:
   ──→ [CANCELLED] (terminal, requiere confirmación con ConfirmDialog)

   Transiciones Legales Exactas:
   ┌──────────────┬────────────────────────────────┐
   │ Estado Actual │ Puede transitar a:             │
   ├──────────────┼────────────────────────────────┤
   │ PENDING      │ RECEIVED                       │
   │ RECEIVED     │ IN_PROCESS                     │
   │ IN_PROCESS   │ QC_REVIEW                      │
   │ QC_REVIEW    │ IN_PROCESS, COMPLETED          │
   │ COMPLETED    │ (ninguno — terminal)            │
   │ CANCELLED    │ (ninguno — terminal)            │
   └──────────────┴────────────────────────────────┘
```

**Flujo de gestión en /service-orders/:id:**

```
DIAGRAMA DE FLUJO — CU-17: Ciclo de Vida de la Orden

[Coordinador navega a /service-orders/:id]
    │
    ▼
[Cargar GET /api/v1/service-orders/:id]
    │
    ▼
[Mostrar panel de datos:]
    ├── Número de orden + Badge de estado actual
    ├── Cliente, Tipo de servicio, Prioridad
    ├── Fechas: Solicitada, Límite, Creación
    ├── Observaciones
    │
    ▼
[Panel "Estado" con botones de transición:]
    │
    ├── Si estado = PENDING:
    │   ├── [Marcar como Recibida] → PATCH /api/v1/service-orders/:id/status {RECEIVED}
    │   └── [Cancelar orden] → ConfirmDialog → DELETE /api/v1/service-orders/:id/cancel
    │
    ├── Si estado = RECEIVED:
    │   └── [Marcar como En Proceso] → PATCH → IN_PROCESS
    │
    ├── Si estado = IN_PROCESS:
    │   └── [Enviar a Revisión QC] → PATCH → QC_REVIEW
    │
    ├── Si estado = QC_REVIEW:
    │   ├── [Devolver a proceso] → PATCH → IN_PROCESS
    │   └── [Marcar como Completada] → PATCH → COMPLETED
    │
    └── Si estado = COMPLETED o CANCELLED:
        └── Mensaje: "Estado terminal, no admite más transiciones"
    │
    ▼
[Sección "Dosímetros solicitados":]
    │
    │   Tabla con cada dosímetro de la orden:
    │   ├── Número de serie + Código interno
    │   ├── Trabajador asignado (badge azul con nombre y documento)
    │   │   o "Control / Sin usuario" (badge gris)
    │   ├── Tipo de dosímetro
    │   ├── Acción requerida (Lectura / Limpieza / Recarga / Inspección)
    │   └── Estado del ítem
    │
    ├── Si estado = PENDING:
    │   ├── [Botón "Agregar dosímetro"] → AddItemModal (búsqueda + selección)
    │   └── [Botón "Quitar" por cada ítem] → removeServiceOrderItem
    │
    └── Si estado ≠ PENDING: solo lectura
    │
    ▼
[Botones de documentos siempre visibles:]
    ├── [📄 Formulario REPDOS-01]
    └── [📦 Nota de Entrega]
    │
    ▼
[FIN]
```

---

## CU-18: GENERACIÓN DEL FORMULARIO REPDOS-01

**Actores:** Coordinador de Laboratorio, Cliente (firma de conformidad)

**Descripción:** Genera el documento oficial "Formulario de Entrega y Recibo de Dosímetros (REPDOS-01)" de Horacio Icaza y Cía., S.A. Este formulario es un requisito normativo para la cadena de custodia dosimétrica.

```
DIAGRAMA DE FLUJO — CU-18: Formulario REPDOS-01

[Desde /service-orders/:id o post-creación de orden]
    │
    ▼
[Clic en botón "📄 Formulario REPDOS-01"]
    │
    ▼
[Abrir DocumentPreviewModal]
    │
    ▼
[Renderizar documento REPDOS-01 con los datos de la orden:]
    │
    │   ┌─────────────────────────────────────────────────┐
    │   │            HORACIO ICAZA Y CIA., S.A.            │
    │   │   FORMULARIO DE ENTREGA Y RECIBO DE DOSIMETROS  │
    │   │            (CLIENTES) REPDOS-01                  │
    │   ├─────────────────────────────────────────────────┤
    │   │ Institución: [nombre_cliente]  No: [código]     │
    │   │ Fecha: [fecha_orden]  Período: [período]        │
    │   │ No. de Lote: [lote]                              │
    │   ├─────────────────────────────────────────────────┤
    │   │ DOSIMETROS ENTREGADOS:                           │
    │   │ # │ Serie │ Tipo │ Trabajador │ Acción           │
    │   │ 1 │ TL... │ TLD  │ J. Pérez   │ Lectura         │
    │   │ 2 │ TL... │ TLD  │ M. García  │ Lectura         │
    │   ├─────────────────────────────────────────────────┤
    │   │ Radiación de fondo: 0.12 µSv/h                  │
    │   │ Contaminación superficial: < 0.05 Bq/cm²        │
    │   │ Teléfonos de consulta: 2076300, 2076370         │
    │   ├─────────────────────────────────────────────────┤
    │   │ Observaciones: [texto]                           │
    │   ├─────────────────────────────────────────────────┤
    │   │                                                  │
    │   │ _______________    _______________                │
    │   │ Firma Empresa      Firma Cliente                 │
    │   │ [nombre_lab]       [nombre_cliente_signee]       │
    │   └─────────────────────────────────────────────────┘
    │
    ├── [Botón "Editar datos del documento"] → EditDocumentDataModal
    │   ├── Campos editables: Firmante empresa, Firmante cliente,
    │   │   Período, Lote, No. institución, Observaciones,
    │   │   Radiación de fondo, Contaminación medida, Teléfonos
    │   └── [Guardar] → Actualizar document_data en la orden
    │
    ├── [Botón "Imprimir"] → window.print() con estilos de impresión CSS optimizados
    │
    └── [Botón "Cerrar"]
    │
    ▼
[FIN]
```

---

## CU-19: GENERACIÓN DE NOTA DE ENTREGA

**Descripción:** Genera el documento de remisión/despacho que acompaña al envío físico de los dosímetros hacia las instalaciones del cliente.

```
DIAGRAMA DE FLUJO — CU-19: Nota de Entrega

[Mismo flujo que CU-18 pero con pestaña "Nota de Entrega"]
    │
    ▼
[Renderizar DeliveryNoteDocument con datos de la orden:]
    ├── Datos del remitente (laboratorio)
    ├── Datos del destinatario (cliente)
    ├── Lista de dosímetros con cantidades y descripción
    ├── Fecha de despacho
    └── Firma del despachador
    │
    ▼
[Imprimir o cerrar]
    │
    ▼
[FIN]
```

---

## CU-20: RECEPCIÓN E INSPECCIÓN FÍSICA DE DOSÍMETROS (ISO 17025)

**Actores:** Técnico de Recepción (requiere permiso `receptions:create`)

**Descripción:** Proceso crítico de calidad. Cuando los dosímetros regresan físicamente al laboratorio, el técnico debe inspeccionar cada uno individualmente, registrar la condición del embalaje, verificar la presencia de todos los ítems declarados en la orden, fotografiar evidencias y detectar anomalías.

```
DIAGRAMA DE FLUJO — CU-20: Recepción e Inspección Física

[Técnico navega a /receptions y presiona "Nueva recepción"]
    │
    ▼
[Redirige a /receptions/new — página completa]
    │
    ▼
═══════════════════════════════════════════
    PASO 1: SELECCIONAR ORDEN DE SERVICIO
═══════════════════════════════════════════
    │
    ▼
[Cargar órdenes de servicio pendientes de recepción]
[GET /api/v1/receptions/pending-orders (filtra status = PENDING)]
    │
    ▼
[Mostrar lista de órdenes pendientes con:]
    ├── Número de orden
    ├── Cliente
    ├── Fecha
    └── Cantidad de dosímetros esperados
    │
    ▼
[Seleccionar una orden]
    │
    ▼
[Se precargan automáticamente todos los dosímetros declarados en la orden]
    │
    ▼
═══════════════════════════════════════════
 PASO 2: INSPECCIÓN GENERAL DEL PAQUETE
═══════════════════════════════════════════
    │
    ▼
[Condición del embalaje exterior*:]
    ├── Íntegro (paquete en perfecto estado)
    ├── Dañado (golpes, aplastamiento)
    ├── Abierto (evidencia de apertura no autorizada)
    └── Húmedo (exposición a líquidos)
    │
    ▼
[Observaciones generales del paquete] (texto libre)
    │
    ▼
═══════════════════════════════════════════
PASO 3: INSPECCIÓN INDIVIDUAL DE CADA DOSÍMETRO
═══════════════════════════════════════════
    │
    ▼
[Para cada dosímetro declarado en la orden:]
    │
    │   ┌──────────────────────────────────────────────┐
    │   │ [✓] Incluir  Serie: TLD-2024-0042            │
    │   │              Código: INT-042                  │
    │   │              Tipo: TLD  |  Foto: [miniatura] │
    │   │                                              │
    │   │ Condición recibida:                          │
    │   │   ○ Normal (íntegro)                         │
    │   │   ○ Roto                                     │
    │   │   ○ Filtro dañado                            │
    │   │   ○ Sin etiqueta                             │
    │   │   ○ Humedecido                               │
    │   │                                              │
    │   │ ☐ Sello íntegro     ☐ Contaminación detectada│
    │   │                                              │
    │   │ Observaciones: [________________]            │
    │   │                                              │
    │   │ Fotografía de evidencia:                     │
    │   │   [📷 Subir foto] → Upload a storage         │
    │   │   [Miniatura con previsualización]           │
    │   └──────────────────────────────────────────────┘
    │
    ├── Si un dosímetro NO llegó en el paquete:
    │   └── Desmarcar casilla "Incluir" → No se registra en la recepción
    │       (queda como discrepancia documentada)
    │
    ▼
═══════════════════════════════════════════
        PASO 4: CONFIRMAR RECEPCIÓN
═══════════════════════════════════════════
    │
    ▼
[Resumen de dosímetros marcados como recibidos vs. declarados]
    │
    ▼
[Clic "Registrar recepción"]
    │
    ▼
[POST /api/v1/receptions con payload:]
    {
      service_order_id,
      packaging_condition,
      observations,
      items: [{
        dosimeter_id,
        received_condition,
        sealed,
        contaminated,
        condition_photo_url,
        observations
      }, ...]
    }
    │
    ▼
[Backend genera reception_code automático (ej: REC-2026-0003)]
[Backend inserta reception + reception_items]
[Backend puede crear incident_reports automáticos si detecta anomalías]
[AuditService.log() — CREATE]
    │
    ▼
[Toast "Recepción registrada correctamente"]
    │
    ▼
[Redirigir a /receptions/:id (Acta de Recepción)]
    │
    ▼
[FIN]
```

---

## CU-21: CONSULTA DEL ACTA DE RECEPCIÓN

**Actores:** Cualquier usuario con permiso `receptions:read`

```
DIAGRAMA DE FLUJO — CU-21: Acta de Recepción

[Usuario navega a /receptions/:id]
    │
    ▼
[Cargar GET /api/v1/receptions/:id]
    │
    ▼
[Mostrar Constancia de Ingreso ISO 17025:]
    │
    ├── Datos Generales del Ingreso:
    │   ├── Orden de servicio vinculada (enlace clicable)
    │   ├── Cliente institucional
    │   ├── Fecha y hora de recepción
    │   ├── Estado del embalaje exterior (Badge de condición)
    │   ├── Receptor técnico (nombre + email)
    │   ├── Total de dosímetros verificados
    │   └── Observaciones del paquete
    │
    └── Tabla de Dosímetros Inspeccionados:
        │
        │ Columnas:
        │ ├── Dosímetro (foto + serie + código interno)
        │ ├── Tecnología / Modelo (fabricante)
        │ ├── Condición recibida (badge: Normal/Roto/Filtro dañado/etc.)
        │ ├── Sello: ✓ Íntegro (verde) / ✕ Roto (rojo)
        │ ├── Contaminación: No (gris) / ⚠ SÍ (rojo pulsante)
        │ ├── Evidencia fotográfica (miniatura clicable → modal de zoom)
        │ └── Incidentes detectados (tarjetas rojo con tipo + severidad + descripción)
        │
        │ Filas con incidentes se resaltan con fondo rosa sutil
        │ Filas sin anomalías muestran "Sin anomalías" (verde)
    │
    ▼
[FIN — Vista de consulta para auditoría]
```

---

## DIAGRAMA GENERAL DE NAVEGACIÓN DE LA APLICACIÓN

```
DIAGRAMA DE FLUJO — Navegación General del Sistema

                          ┌─────────────┐
                          │   /login    │
                          │  (Público)  │
                          └──────┬──────┘
                                 │ Login exitoso
                                 ▼
                    ┌────────────────────────┐
                    │      SIDEBAR LATERAL   │
                    │  (siempre visible)     │
                    ├────────────────────────┤
                    │ • Dashboard            │────→ /dashboard
                    │ • Usuarios      [P]    │────→ /users ──→ /users/:id
                    │ • Clientes      [P]    │────→ /clients ──→ /clients/:id
                    │ • Trabajadores  [P]    │────→ /workers
                    │ • Dosímetros    [P]    │────→ /dosimeters ──→ /dosimeters/:id
                    │ • Órdenes      [P]    │────→ /service-orders
                    │   de servicio          │      ├──→ /service-orders/new
                    │                        │      └──→ /service-orders/:id
                    │ • Recepciones  [P]    │────→ /receptions
                    │                        │      ├──→ /receptions/new
                    │                        │      └──→ /receptions/:id
                    ├────────────────────────┤
                    │ [Nombre usuario]       │────→ ProfileModal
                    │ [Cerrar sesión]        │────→ POST /auth/logout → /login
                    └────────────────────────┘

    [P] = Visible solo si el usuario tiene el permiso de lectura del módulo
    Todas las rutas privadas requieren autenticación (PrivateRoute)
    Todas las rutas de módulo verifican permisos (PermissionRoute)
```

---

## FLUJO COMPLETO DE NEGOCIO: CICLO OPERATIVO DE DOSIMETRÍA

Este diagrama muestra cómo los casos de uso se conectan en el flujo real de operaciones del laboratorio:

```
DIAGRAMA DE FLUJO — Ciclo Operativo Completo

═══════════════════════════════════════════════════════════════════
                  FASE 1: PREPARACIÓN Y REGISTRO
═══════════════════════════════════════════════════════════════════

[Alta de dosímetros en inventario] (CU-11)
    │
    ▼
[Registro de clientes e instituciones] (CU-08)
    │
    ▼
[Registro de sedes con tipo de radiación y riesgo] (CU-09)
    │
    ▼
[Registro de trabajadores expuestos por sede] (CU-10)

═══════════════════════════════════════════════════════════════════
                  FASE 2: DESPACHO A CAMPO
═══════════════════════════════════════════════════════════════════

    │
    ▼
[Asignar dosímetros a trabajadores] (CU-12)
    │ Estado: DISPONIBLE → ASIGNADO
    │
    ▼
[Crear orden de servicio con dosímetros seleccionados] (CU-16)
    │ Estado orden: PENDING
    │
    ▼
[Generar formulario REPDOS-01 para firma de conformidad] (CU-18)
    │
    ▼
[Generar nota de entrega para despacho físico] (CU-19)
    │
    ▼
[Dosímetros salen del laboratorio hacia el cliente]
    │
    ▼
    ═══════ PERÍODO DE USO EN CAMPO (30-90 días típico) ═══════

═══════════════════════════════════════════════════════════════════
              FASE 3: RETORNO Y RECEPCIÓN EN LABORATORIO
═══════════════════════════════════════════════════════════════════

    │
    ▼
[Cliente devuelve dosímetros al laboratorio]
    │
    ▼
[Registrar devolución de dosímetros] (CU-13)
    │ Estado: ASIGNADO → DISPONIBLE
    │
    ▼
[Crear recepción e inspeccionar cada dosímetro] (CU-20)
    │ Verificar: condición, sello, contaminación, foto de evidencia
    │
    ▼
[Actualizar estado de la orden] (CU-17)
    │ Estado orden: PENDING → RECEIVED → IN_PROCESS
    │
    ▼

═══════════════════════════════════════════════════════════════════
              FASE 4: PROCESAMIENTO EN LABORATORIO
═══════════════════════════════════════════════════════════════════

[Cambiar estado de dosímetros a EN_PROCESO] (CU-14)
    │
    ▼
[Control de contaminación radiactiva superficial]
    │ (Registrado en pestaña de contaminación del dosímetro — CU-15)
    │
    ▼
[Lectura en equipo TLD/OSL Reader]
    │ Se registran: dosis medida, Hp(10), Hp(0.07), incertidumbre
    │ (Visible en pestaña de lecturas del dosímetro — CU-15)
    │
    ▼
[Control de calidad (QC)]
    │ Estado orden: IN_PROCESS → QC_REVIEW
    │
    ▼
◆ ¿QC aprobado?
    │ NO → Devolver a IN_PROCESS para reprocesar
    │ SÍ
    ▼
[Marcar orden como COMPLETED] (CU-17)
    │
    ▼
[Recocido térmico (annealing) de dosímetros TLD]
    │
    ▼
[Cambiar estado de dosímetros a DISPONIBLE] (CU-14)
    │
    ▼
═══ El ciclo comienza de nuevo con la siguiente asignación ═══
```

---

## INSTRUCCIONES PARA GEMINI

Por favor, genera las siguientes ilustraciones profesionales basándote en los diagramas de texto de este documento:

1. **Para cada "DIAGRAMA DE FLUJO"**: Genera un diagrama de flujo visual con cajas rectangulares para procesos, rombos para decisiones, flechas direccionales, y badges de colores para estados. Usa estilo limpio y profesional con paleta azul/gris.

2. **Para cada "DIAGRAMA DE MÁQUINA DE ESTADOS"**: Genera un diagrama de estados con nodos circulares/redondeados y transiciones etiquetadas con la acción que causa el cambio.

3. **Para el "Diagrama General de Navegación"**: Genera un mapa de sitio visual que muestre la jerarquía de páginas, las rutas y las relaciones entre módulos.

4. **Para el "Ciclo Operativo Completo"**: Genera un diagrama de proceso de negocio (BPM) con las 4 fases claramente separadas por colores y con iconografía representativa (laboratorio, campo, transporte, etc.).

5. **Estilo visual sugerido**: Fondo blanco o gris muy claro, tipografía sans-serif, iconos simples, badges de colores semáforo (verde=OK, amarillo=advertencia, rojo=error), sombras sutiles para dar profundidad.
