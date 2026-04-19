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
var AssignPermissionUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignPermissionUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let AssignPermissionUseCase = AssignPermissionUseCase_1 = class AssignPermissionUseCase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(AssignPermissionUseCase_1.name);
    }
    async execute(userId, dto, organizationId, grantedBy) {
        const client = this.supabase.getClient();
        if (userId === grantedBy) {
            throw new common_1.BadRequestException('No podés asignarte permisos a vos mismo');
        }
        const { data: targetUser } = await client
            .from('users')
            .select('id, full_name, status')
            .eq('id', userId)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (!targetUser) {
            throw new common_1.NotFoundException('Usuario no encontrado en esta organización');
        }
        if (targetUser.status !== 'active') {
            throw new common_1.BadRequestException('No se pueden asignar permisos a un usuario inactivo');
        }
        const { data: permission } = await client
            .from('permissions')
            .select('id, code, module, action, description')
            .eq('id', dto.permission_id)
            .maybeSingle();
        if (!permission) {
            throw new common_1.NotFoundException(`El permiso con id '${dto.permission_id}' no existe en el catálogo`);
        }
        const { data: existingPermission } = await client
            .from('user_permissions')
            .select('id, granted')
            .eq('user_id', userId)
            .eq('permission_id', dto.permission_id)
            .maybeSingle();
        if (existingPermission?.granted === true) {
            return {
                message: `El usuario ya tiene el permiso '${permission.code}' activo`,
                permission: permission,
                changed: false,
            };
        }
        const { error: upsertError } = await client
            .from('user_permissions')
            .upsert({
            user_id: userId,
            permission_id: dto.permission_id,
            granted: true,
            granted_by: grantedBy,
            granted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,permission_id' });
        if (upsertError) {
            this.logger.error('Error al asignar permiso:', upsertError);
            throw new Error('No se pudo asignar el permiso');
        }
        const action = existingPermission ? 'UPDATE' : 'CREATE';
        await client
            .from('audit_logs')
            .insert({
            user_id: grantedBy,
            entity_name: 'user_permissions',
            entity_id: userId,
            action,
            old_values: existingPermission ? { granted: false } : null,
            new_values: {
                permission_code: permission.code,
                granted: true,
                granted_by: grantedBy,
            },
        });
        return {
            message: `Permiso '${permission.code}' asignado correctamente`,
            permission: permission,
            changed: true,
        };
    }
};
exports.AssignPermissionUseCase = AssignPermissionUseCase;
exports.AssignPermissionUseCase = AssignPermissionUseCase = AssignPermissionUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], AssignPermissionUseCase);
//# sourceMappingURL=assign-permission.use-case.js.map