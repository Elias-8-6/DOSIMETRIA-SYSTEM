import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseService
 *
 * Provee un cliente Supabase con service_role_key.
 * Este cliente bypassa RLS completamente — solo debe usarse
 * dentro de NestJS, nunca exponerse al frontend.
 *
 * La seguridad la garantiza NestJS a través de:
 *   - JwtGuard: verifica que el token sea válido
 *   - RolesGuard: verifica que el rol activo tenga permisos
 *   - AuditLogInterceptor: registra toda acción crítica
 */
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Retorna el cliente Supabase con service_role_key.
   * Usar exclusivamente dentro de servicios NestJS.
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}
