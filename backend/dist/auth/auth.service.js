"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const supabase_config_1 = require("../config/supabase.config");
const config_1 = require("@nestjs/config");
let AuthService = AuthService_1 = class AuthService {
    constructor(supabase, jwt, config) {
        this.supabase = supabase;
        this.jwt = jwt;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto) {
        const client = this.supabase.getClient();
        const { data: user, error } = await client
            .from("users")
            .select("id, full_name, email, password_hash, organization_id, status")
            .eq("email", dto.email)
            .single();
        if (error || !user) {
            throw new common_1.UnauthorizedException("Credenciales incorrectas");
        }
        if (user.status !== "active") {
            throw new common_1.UnauthorizedException("El usuario está inactivo o bloqueado");
        }
        const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException("Credenciales incorrectas");
        }
        const { data: userRoles } = await client
            .from("user_roles")
            .select("roles(code, name)")
            .eq("user_id", user.id);
        if (!userRoles?.length) {
            throw new common_1.ForbiddenException("El usuario no tiene roles asignados");
        }
        const token = this.generateToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, user.organization_id);
        return {
            access_token: token,
            refresh_token: refreshToken,
        };
    }
    async getProfile(user) {
        const client = this.supabase.getClient();
        const { data: userData, error: userError } = await client
            .from("users")
            .select("id, full_name, email, status, created_at, organization_id")
            .eq("id", user.sub)
            .single();
        if (userError || !userData) {
            throw new common_1.NotFoundException("Usuario no encontrado");
        }
        const { data: orgData } = await client
            .from("organizations")
            .select("name")
            .eq("id", userData.organization_id)
            .single();
        const { data: rolesData, error: rolesError } = await client
            .from("user_roles")
            .select("roles(code, name)")
            .eq("user_id", user.sub);
        const { data: permissionsData, error: permissionsError } = await client
            .from("user_permissions")
            .select("granted, permissions(code, module, action, description)")
            .eq("user_id", user.sub)
            .eq("granted", true);
        const roles = (rolesData ?? []).map((ur) => ur.roles);
        const permissions = (permissionsData ?? []).map((up) => up.permissions);
        return {
            id: userData.id,
            full_name: userData.full_name,
            email: userData.email,
            status: userData.status,
            organization: orgData?.name ?? null,
            roles,
            permissions,
        };
    }
    generateToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id,
        };
        return this.jwt.sign(payload);
    }
    async generateRefreshToken(userId, organizationId) {
        const refreshToken = this.jwt.sign({ sub: userId, organization_id: organizationId }, {
            secret: this.config.get("JWT_REFRESH_SECRET"),
            expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", "7d"),
        });
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.supabase.getClient().from("refresh_tokens").insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            revoked: false,
        });
        return refreshToken;
    }
    async refreshToken(userId, refreshToken) {
        const { data: tokens } = await this.supabase
            .getClient()
            .from("refresh_tokens")
            .select("id, token_hash, expires_at, revoked")
            .eq("user_id", userId)
            .eq("revoked", false);
        if (!tokens?.length) {
            throw new common_1.UnauthorizedException("Sesión expirada - iniciá sesión nuevamente");
        }
        let matchingToken = null;
        for (const token of tokens) {
            const matches = await bcrypt.compare(refreshToken, token.token_hash);
            if (matches) {
                matchingToken = token;
                break;
            }
        }
        if (!matchingToken) {
            throw new common_1.UnauthorizedException("Refresh token inválido");
        }
        const now = new Date();
        const expiresAt = new Date(matchingToken.expires_at);
        if (now > expiresAt) {
            throw new common_1.UnauthorizedException("Refresh token expirado -- Inicia sesión Nuevamente");
        }
        await this.supabase
            .getClient()
            .from("refresh_tokens")
            .update({
            revoked: true,
            revoked_at: new Date().toISOString(),
        })
            .eq("id", matchingToken.id);
        const { data: user } = await this.supabase
            .getClient()
            .from("users")
            .select("id, full_name, email, organization_id, status")
            .eq("id", userId)
            .single();
        if (!user || user.status !== "active") {
            throw new common_1.UnauthorizedException("Usuario inactivo");
        }
        const newAccessToken = this.generateToken(user);
        const newRefreshToken = await this.generateRefreshToken(userId, user.organization_id);
        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
        };
    }
    async logout(userId) {
        await this.supabase
            .getClient()
            .from("refresh_tokens")
            .update({
            revoked: true,
            revoked_at: new Date().toISOString(),
        })
            .eq("user_id", userId)
            .eq("revoked", false);
        return { message: "Sesión cerrada correctamente" };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map