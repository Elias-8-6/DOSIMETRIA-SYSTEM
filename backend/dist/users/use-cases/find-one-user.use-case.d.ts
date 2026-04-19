import { SupabaseService } from '@config/supabase.config';
export declare class FindOneUserUseCase {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    execute(full_name: string, organizationId: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
        permissions: any[];
    }>;
}
