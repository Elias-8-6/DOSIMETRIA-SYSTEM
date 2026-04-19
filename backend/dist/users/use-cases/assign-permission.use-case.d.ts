import { SupabaseService } from '@config/supabase.config';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
export declare class AssignPermissionUseCase {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    execute(userId: string, dto: AssignPermissionDto, organizationId: string, grantedBy: string): Promise<{
        message: string;
        permission: {
            id: any;
            code: any;
            module: any;
            action: any;
            description: any;
        };
        changed: boolean;
    }>;
}
