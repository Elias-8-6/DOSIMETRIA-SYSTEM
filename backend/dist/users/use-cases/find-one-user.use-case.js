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
exports.FindOneUserUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let FindOneUserUseCase = class FindOneUserUseCase {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async execute(full_name, organizationId) {
        const client = this.supabase.getClient();
        const { data: user, error } = await client
            .from('users')
            .select('id, full_name, email, status, created_at')
            .eq('full_name', full_name)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (error || !user) {
            throw new common_1.NotFoundException('Usuario no encontrado en esta organización');
        }
        const { data: rolesData } = await client
            .from('user_roles')
            .select('roles ( code, name )')
            .eq('full_name', full_name);
        const { data: permissionsData } = await client
            .from('user_permissions')
            .select('granted, permissions ( id, code, module, action, description )')
            .eq('full_name', full_name)
            .eq('granted', true);
        const roles = (rolesData ?? []).map((ur) => ur.roles);
        const permissions = (permissionsData ?? []).map((up) => up.permissions);
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            status: user.status,
            created_at: user.created_at,
            roles,
            permissions,
        };
    }
};
exports.FindOneUserUseCase = FindOneUserUseCase;
exports.FindOneUserUseCase = FindOneUserUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], FindOneUserUseCase);
//# sourceMappingURL=find-one-user.use-case.js.map