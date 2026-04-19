import { JwtService } from "@nestjs/jwt";
import { SupabaseService } from "@config/supabase.config";
import { JwtPayload } from "@common/interfaces/jwt-payload.interface";
import { LoginDto } from "./dto/login.dto";
import { ConfigService } from "@nestjs/config";
export declare class AuthService {
    private readonly supabase;
    private readonly jwt;
    private readonly config;
    private readonly logger;
    constructor(supabase: SupabaseService, jwt: JwtService, config: ConfigService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getProfile(user: JwtPayload): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        organization: any;
        roles: any[];
        permissions: any[];
    }>;
    private generateToken;
    private generateRefreshToken;
    refreshToken(userId: string, refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
}
