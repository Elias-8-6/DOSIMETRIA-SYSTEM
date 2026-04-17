import { SupabaseService } from '@config/supabase.config';
export declare class FindAllUsersUseCase {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    execute(organizationId: string, search?: string, status?: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
    }[]>;
}
