import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { AuditService } from '@common/services/audit.service';

/**
 * Interceptor opcional: si el use-case adjunta response._audit, registra el evento.
 * Preferir AuditService directamente en use-cases (más explícito y tipado).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    return next.handle().pipe(
      tap((response) => {
        if (!response?._audit) return;

        const { entity, entityId, action, oldValues, newValues } = response._audit;
        void this.audit.log({
          userId: user?.sub ?? null,
          entityName: entity,
          entityId: entityId ?? null,
          action,
          oldValues: oldValues ?? null,
          newValues: newValues ?? null,
        });

        delete response._audit;
      }),
    );
  }
}
