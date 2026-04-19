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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const check_permission_decorator_1 = require("../decorators/check-permission.decorator");
const supabase_config_1 = require("../../config/supabase.config");
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector, supabase) {
        this.reflector = reflector;
        this.supabase = supabase;
    }
    async canActivate(context) {
        const required = this.reflector.getAllAndOverride(check_permission_decorator_1.CHECK_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!required)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.sub) {
            throw new common_1.UnauthorizedException("Usuario no autenticado");
        }
        const permissionCode = `${required.module}:${required.action}`;
        const { data, error } = await this.supabase
            .getClient()
            .from("user_permissions")
            .select("granted, permissions!inner(code)")
            .eq("user_id", user.sub)
            .eq("granted", true)
            .eq("permissions.code", permissionCode)
            .maybeSingle();
        if (error) {
            throw new common_1.ForbiddenException("Error al verificar permisos");
        }
        if (!data) {
            throw new common_1.ForbiddenException(`No tenés permiso para '${permissionCode}'`);
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        supabase_config_1.SupabaseService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map