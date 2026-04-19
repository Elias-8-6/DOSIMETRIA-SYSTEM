import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "@common/interfaces/jwt-payload.interface";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    logout(user: JwtPayload): Promise<{
        message: string;
    }>;
    refresh(user: JwtPayload & {
        refreshToken: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
