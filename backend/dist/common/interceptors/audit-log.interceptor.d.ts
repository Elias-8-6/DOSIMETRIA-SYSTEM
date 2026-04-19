import { NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { SupabaseService } from "@config/supabase.config";
export declare class AuditLogInterceptor implements NestInterceptor {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
