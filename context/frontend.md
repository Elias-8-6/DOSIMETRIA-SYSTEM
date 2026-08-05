# Contexto Frontend

## React + Vite - Aplicación Web

## Stack Tecnológico

- **Framework**: React 19.x
- **Lenguaje**: TypeScript
- **Build Tool**: Vite 8.x
- **Styling**: Tailwind CSS 4.x
- **Routing**: React Router 7.x
- **HTTP Client**: Axios
- **Linting**: ESLint 9.x

## Estructura de Directorios

```
src/
├── api/            # Configuración de API y servicios
├── components/     # Componentes reutilizables
├── context/        # Contextos de React (Auth, etc.)
├── hooks/          # Custom hooks
├── pages/          # Vistas/páginas de la aplicación
├── router/         # Configuración de rutas
├── assets/         # Recursos estáticos
├── App.tsx         # Componente principal
├── main.tsx        # Punto de entrada
└── index.css       # Estilos globales (Tailwind)
```

## Componentes Core

- Layout principal con navegación
- Formularios de autenticación
- Tablas de datos con paginación
- Cards y componentes UI básicos

## Páginas Principales

- Login/Logout
- Dashboard
- Gestión de usuarios
- Gestión de clientes/trabajadores
- Órdenes de servicio
- Procesos de laboratorio

## Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Producción
npm run lint         # Linting
npm run format       # Formateo Prettier
npm run preview      # Preview de build
```

## Configuración de API

El cliente Axios se configura en `api/` con:
- Base URL apuntando al backend
- Interceptors para JWT
- Manejo de errores centralizado

## Contextos

- **AuthContext**: Manejo de estado de autenticación y usuario

## Rutas

Configuradas con React Router 7 en `router/`. Protegidas con guards de autenticación.

## Estilos

Tailwind CSS 4 con configuración via Vite plugin. Variables CSS para theming.
