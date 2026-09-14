import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

export interface AuditEntry {
  userId: string | null;
  entityName: string;
  entityId?: string | null;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Servicio unificado de auditoría ISO 17025.
 * Nunca lanza: un fallo de audit no debe romper la operación de negocio.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().from('audit_logs').insert({
        user_id: entry.userId,
        entity_name: entry.entityName,
        entity_id: entry.entityId ?? null,
        action: entry.action,
        old_values: entry.oldValues ?? null,
        new_values: entry.newValues ?? null,
        ip_address: entry.ipAddress ?? null,
        user_agent: entry.userAgent ?? null,
      });

      if (error) {
        this.logger.error(`Error al registrar audit (${entry.action}): ${error.message}`);
      }
    } catch (err) {
      this.logger.error(
        `Error al registrar audit (${entry.action})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
