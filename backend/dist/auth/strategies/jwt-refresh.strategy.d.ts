import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { JwtPayload } from "@common/interfaces/jwt-payload.interface";
declare const JwtRefreshStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    constructor(config: ConfigService);
    validate(req: Request, payload: JwtPayload): Promise<{
        refreshToken: string;
        sub: string;
        email: string;
        full_name: string;
        organization_id: string;
        iat?: number;
        exp?: number;
    }>;
}
export {};
