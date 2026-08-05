import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from '@config/supabase.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

import { ClientsModule } from '@clients/clients.module';

/**
 * AppModule — módulo raíz de la aplicación.
 *
 * SupabaseModule es @Global() — SupabaseService queda disponible
 * en todos los módulos sin importarlo en cada uno.
 * Esto es necesario para que PermissionsGuard pueda consultar
 * user_permissions en cualquier módulo que lo use.
 *
 * Sistema de autorización en cada controller:
 *   @UseGuards(JwtGuard, PermissionsGuard)
 *   @CheckPermission('modulo', 'accion')
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule, // @Global() — SupabaseService disponible en toda la app
    AuthModule,
    UsersModule,
    ClientsModule,
    // DosimetersModule,
    // ServiceOrdersModule,
    // ReceptionsModule,
    // LabProcessModule,
    // ReportsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
