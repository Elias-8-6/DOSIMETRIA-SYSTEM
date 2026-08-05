import { SupabaseService } from '@config/supabase.config';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UpdateUserUseCase {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    execute(userId: string, dto: UpdateUserDto, organizationId: string, requestingUserId: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
    }>;
}
