import { SupabaseService } from "@config/supabase.config";
import { CreateUserDto } from "../dto/create-user.dto";
export declare class CreateUserUseCase {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    execute(dto: CreateUserDto, organizationId: string, grantedBy: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        role_code: string;
    }>;
}
