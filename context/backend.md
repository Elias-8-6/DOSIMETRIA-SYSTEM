# Contexto Backend

## NestJS API - Sistema de Dosimetría

## Stack Tecnológico

- **Framework**: NestJS 10.x
- **Lenguaje**: TypeScript 5.x
- **ORM**: Supabase JS Client
- **Auth**: Passport JWT + Refresh Tokens
- **Validación**: class-validator, class-transformer
- **Testing**: Jest

## Estructura de Directorios

```
src/
├── app.module.ts       # Módulo principal
├── main.ts             # Punto de entrada
├── auth/               # Módulo de autenticación
│   ├── strategies/     # Estrategias Passport
│   ├── guards/         # Guards de autorización
│   └── decorators/    # Decoradores custom
├── users/              # Módulo de usuarios
├── common/             # Recursos compartidos
│   ├── filters/        # Filtros de excepciones
│   ├── interceptors/   # Interceptores
│   └── dto/            # DTOs compartidos
└── config/             # Configuración
```

## Módulos Principales

### Auth Module
- Login/Logout
- Refresh tokens
- JWT strategy
- Roles y permisos

### Users Module
- CRUD de usuarios
- Perfiles de usuario

## Scripts Disponibles

```bash
npm run start:dev      # Desarrollo con watch
npm run start:debug    # Debug con watch
npm run start:prod     # Producción
npm run build          # Compilar
npm run lint           # Linting
npm run test           # Tests
npm run test:cov       # Coverage
```

## Conexión a Base de Datos

Utiliza `@supabase/supabase-js` para comunicarse con Supabase PostgreSQL. La conexión se configura mediante variables de entorno en `.env`.

## Middlewares Importantes

- ValidationPipe (validación de DTOs)
- ClassSerializerInterceptor (transformación de respuestas)
- AuthGuard (protección de rutas)

## Notas de Desarrollo

- Seguir la convención de módulos NestJS
- Usar DTOs para validación de entrada
- Implementar guards para autorización
- Registrar políticas RLS en Supabase para seguridad a nivel de fila
