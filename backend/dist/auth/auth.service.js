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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const supabase_config_1 = require("../config/supabase.config");
let AuthService = class AuthService {
    constructor(supabase, jwt) {
        this.supabase = supabase;
        this.jwt = jwt;
    }
    async login(dto) {
        const client = this.supabase.getClient();
        const { data: user, error } = await client
            .from('users')
            .select('id, full_name, email, password_hash, organization_id, status')
            .eq('email', dto.email)
            .single();
        if (error || !user) {
            throw new common_1.UnauthorizedException('Credenciales incorrectas');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('El usuario está inactivo o bloqueado');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Credenciales incorrectas');
        }
        const { data: userRoles } = await client
            .from('user_roles')
            .select('roles(code, name)')
            .eq('user_id', user.id);
        const roles = (userRoles ?? []).map((ur) => ur.roles);
        if (!roles.length) {
            throw new common_1.ForbiddenException('El usuario no tiene roles asignados');
        }
        if (roles.length === 1) {
            const token = this.generateToken(user, roles[0].code);
            return {
                access_token: token,
                requires_role_selection: false,
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    active_role: roles[0].code,
                    role_name: roles[0].name,
                },
            };
        }
        const tempToken = this.generateTempToken(user);
        return {
            access_token: tempToken,
            requires_role_selection: true,
            available_roles: roles,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
            },
        };
    }
    async selectRole(user, dto) {
        const client = this.supabase.getClient();
        const { data: roleAssignment } = await client
            .from('user_roles')
            .select('roles(code, name)')
            .eq('user_id', user.sub)
            .eq('roles.code', dto.role)
            .single();
        if (!roleAssignment) {
            throw new common_1.ForbiddenException(`No tenés el rol '${dto.role}' asignado en tu cuenta`);
        }
        const { data: userData } = await client
            .from('users')
            .select('id, full_name, email, organization_id')
            .eq('id', user.sub)
            .single();
        if (!userData) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const token = this.generateToken(userData, dto.role);
        return {
            access_token: token,
            user: {
                id: userData.id,
                full_name: userData.full_name,
                email: userData.email,
                active_role: dto.role,
            },
        };
    }
    async getProfile(user) {
        const client = this.supabase.getClient();
        const { data } = await client
            .from('users')
            .select(`
        id, full_name, email, status, created_at,
        organizations(name),
        user_roles(roles(code, name))
      `)
            .eq('id', user.sub)
            .single();
        return data;
    }
    generateToken(user, activeRole) {
        const payload = {
            sub: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id,
            active_role: activeRole,
        };
        return this.jwt.sign(payload);
    }
    generateTempToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            full_name: user.full_name,
            organization_id: user.organization_id,
            active_role: 'pending_role_selection',
        };
        return this.jwt.sign(payload, { expiresIn: '5m' });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map