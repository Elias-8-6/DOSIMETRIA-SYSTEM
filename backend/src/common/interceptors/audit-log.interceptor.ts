import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SupabaseService } from '@config/supabase.config';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

/**
 * AuditLogInterceptor
 *
 * Registra en audit_logs toda acción sobre entidades críticas.
 * Se activa automáticamente en los módulos que lo declaran.
 *
 * ISO 17025: la trazabilidad documental exige poder reconstruir
 * el estado de cualquier entidad en cualquier momento, incluyendo
 * quién realizó la acción y con qué rol.
 *
 * Qué registra:
 *   - user_id y active_role del JWT
 *   - entity_name y entity_id del contexto del request
 *   - action (CREATE, UPDATE, DELETE, STATUS_CHANGE)
 *   - old_values y new_values (provistos por el use-case)
 *   - timestamp automático
 *
 * Cómo usarlo en un controlador:
 *   @UseInterceptors(AuditLogInterceptor)
 *   @Post()
 *   create(@AuditContext() ctx: AuditCtx) { ... }
 *
 * El use-case adjunta los valores al response para que el interceptor
 * los capture: response._audit = { entity, entityId, action, oldValues, newValues }
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly supabase: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    return next.handle().pipe(
      tap(async (response) => {
        // Solo registrar si el use-case adjuntó datos de auditoría
        if (!response?._audit) return;

        const { entity, entityId, action, oldValues, newValues } =
          response._audit;

        try {
          await this.supabase.getClient().from('audit_logs').insert({
            user_id:     user?.sub ?? null,
            active_role: user?.active_role ?? null,
            entity_name: entity,
            entity_id:   entityId ?? null,
            action,
            old_values:  oldValues ?? null,
            new_values:  newValues ?? null,
          });
        } catch (err) {
          // El audit log nunca debe romper el flujo principal
          // En producción, enviar a un sistema de logging externo
          console.error('[AuditLog] Error al registrar:', err);
        }
      }),
    );
  }
}
