import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SupabaseService } from './config/supabase.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * AppModule — módulo raíz de la aplicación.
 *
 * Registra globalmente:
 * - ConfigModule: carga variables de entorno desde .env
 * - ValidationPipe: valida todos los DTOs automáticamente
 * - HttpExceptionFilter: estandariza todas las respuestas de error
 *
 * A medida que agregues módulos (clients, dosimeters, etc.)
 * los importás aquí.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,   // disponible en todos los módulos sin importar
      envFilePath: '.env',
    }),
    AuthModule,
    // próximos módulos:
    // ClientsModule,
    // DosimetersModule,
    // ServiceOrdersModule,
    // ReceptionsModule,
    // LabProcessModule,
    // ReportsModule,
  ],
  providers: [
    SupabaseService,
    {
      provide:  APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist:            true,  // ignora campos no declarados en el DTO
        forbidNonWhitelisted: true,  // lanza error si llegan campos extra
        transform:            true,  // convierte strings a tipos correctos automáticamente
      }),
    },
  ],
})
export class AppModule {}
