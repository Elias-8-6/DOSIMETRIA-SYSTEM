import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from '@config/supabase.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { JwtGuard } from '@common/guards/jwt.guard';

import { ClientsModule } from '@clients/clients.module';
import { WorkersModule } from './workers/workers.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { DosimetersModule } from '@dosimeters/dosimeters.module';

/**
 * AppModule — módulo raíz.
 *
 * JwtGuard global: endpoints públicos usan @Public().
 * ThrottlerGuard global: límites por defecto; login usa límite más estricto.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    SupabaseModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    WorkersModule,
    CatalogsModule,
    DosimetersModule,
    // Módulos de laboratorio (al implementar, aplicar desde el día 1):
    // - @UseGuards(PermissionsGuard) + @CheckPermission('modulo', 'accion')
    // - organization_id siempre desde @CurrentUser() JWT, nunca del body
    // - AuditService.log() en CREATE / UPDATE / STATUS_CHANGE
    // - paginación con normalizePagination() y sanitizeSearchTerm()
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
