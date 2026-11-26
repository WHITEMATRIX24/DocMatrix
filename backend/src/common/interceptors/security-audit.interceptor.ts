import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, concatMap, from, Observable, throwError } from 'rxjs';
import { AuditLogService } from '../services/audit-log.service.js';

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const record = async (outcome: 'SUCCESS' | 'FAILURE', action = 'API_COMPLETED') => {
      if (!req.user) return;
      await this.audit.recordRequest({ clinicId: req.user.clinicId, module: 'Security', action,
        actorId: req.user.id, actorName: req.user.fullName, actorRole: req.user.role,
        description: `${req.method} ${req.route?.path || 'protected endpoint'}`, outcome,
        ipAddress: req.ip || req.socket?.remoteAddress, userAgent: req.headers['user-agent'],
        metadata: { method: req.method, route: req.route?.path, resourceIds: req.params } });
    };
    return from(record('SUCCESS', 'API_STARTED')).pipe(concatMap(() => next.handle()),concatMap(value => from(record('SUCCESS').then(() => value))),
      catchError(error => from(record('FAILURE')).pipe(concatMap(() => throwError(() => error)))));
  }
}
