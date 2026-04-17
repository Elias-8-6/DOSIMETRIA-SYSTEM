import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SupabaseService } from "@config/supabase.config";
export declare class PermissionsGuard implements CanActivate {
    private readonly reflector;
    private readonly supabase;
    constructor(reflector: Reflector, supabase: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
