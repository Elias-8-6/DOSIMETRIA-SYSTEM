# Contexto General del Proyecto

## Sistema de Trazabilidad de Dosimetría ISO 17025

Sistema de gestión para el control y trazabilidad de dosimetría occupational, orientado a laboratorios acreditados bajo la norma ISO 17025.

## Estructura del Proyecto

```
dosimetria-system/
├── backend/           # API NestJS
├── frontend-web/      # Aplicación React + Vite
├── supabase/          # Base de datos PostgreSQL + Edge Functions
├── docker-compose.yml # Desarrollo local
└── docker-compose.prod.yml # Producción
```

## Tecnologías Principales

- **Backend**: NestJS, TypeScript, Passport (JWT), Supabase Client
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite, React Router 7, Axios
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT con refresh tokens
- **Contenedores**: Docker/Docker Compose

## Funcionalidades Core

- Gestión de clientes, trabajadores y dosis personales
- Control de dosímetros y lecturas dosimétricas
- Órdenes de servicio y recepción de materiales
- Procesos de laboratorio (irradiación, calibración, lecturas)
- Control de calidad (QC) de lecturas
- Control de auditoría y documentos
- Sistema de permisos granular (RLS policies)

## Comandos de Desarrollo

```bash
# Docker (todo el stack)
docker-compose up -d

# Backend
cd backend && npm run start:dev

# Frontend
cd frontend-web && npm run dev
```

## Variables de Entorno Principales

- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_KEY` - API Key de Supabase
- `JWT_SECRET` - Secreto para tokens JWT
