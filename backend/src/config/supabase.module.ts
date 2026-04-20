import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.config';

/**
 * SupabaseModule — módulo global.
 *
 * Al marcarlo con @Global(), SupabaseService queda disponible
 * en todos los módulos de la aplicación sin necesidad de
 * importarlo explícitamente en cada uno.
 *
 * Esto es importante para PermissionsGuard, que necesita
 * SupabaseService para consultar user_permissions en cada
 * request protegido.
 *
 * Se importa una sola vez en AppModule.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
