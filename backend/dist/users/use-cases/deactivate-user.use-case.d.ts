import { SupabaseService } from '@config/supabase.config';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
export declare class DeactivateUserUseCase {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    execute(userId: string, dto: UpdateUserStatusDto, organizationId: string, requestingUserId: string): Promise<{
        id: any;
        status: any;
        message: string;
        full_name?: undefined;
        email?: undefined;
    } | {
        id: any;
        full_name: any;
        email: any;
        status: any;
        message?: undefined;
    }>;
}
