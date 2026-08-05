import { SupabaseService } from '@config/supabase.config';
export declare class RevokePermissionUseCase {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    execute(userId: string, permissionId: string, organizationId: string, revokedBy: string): Promise<{
        message: string;
        changed: boolean;
    }>;
}
