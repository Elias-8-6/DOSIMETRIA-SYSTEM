import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '@config/supabase.config';
import { JwtPayload, Role } from '@common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { SelectRoleDto } from './dto/select-role.dto';
export declare class AuthService {
    private readonly supabase;
    private readonly jwt;
    constructor(supabase: SupabaseService, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        requires_role_selection: boolean;
        user: {
            id: any;
            full_name: any;
            email: any;
            active_role: any;
            role_name: any;
        };
        available_roles?: undefined;
    } | {
        access_token: string;
        requires_role_selection: boolean;
        available_roles: any[];
        user: {
            id: any;
            full_name: any;
            email: any;
            active_role?: undefined;
            role_name?: undefined;
        };
    }>;
    selectRole(user: JwtPayload, dto: SelectRoleDto): Promise<{
        access_token: string;
        user: {
            id: any;
            full_name: any;
            email: any;
            active_role: Role;
        };
    }>;
    getProfile(user: JwtPayload): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        organizations: {
            name: any;
        }[];
        user_roles: {
            roles: {
                code: any;
                name: any;
            }[];
        }[];
    } | null>;
    private generateToken;
    private generateTempToken;
}
