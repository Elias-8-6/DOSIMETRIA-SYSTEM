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
var RevokePermissionUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokePermissionUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let RevokePermissionUseCase = RevokePermissionUseCase_1 = class RevokePermissionUseCase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(RevokePermissionUseCase_1.name);
    }
    async execute(userId, permissionId, organizationId, revokedBy) {
        const client = this.supabase.getClient();
        const { data: targetUser } = await client
            .from('users')
            .select('id, full_name')
            .eq('id', userId)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (!targetUser) {
            throw new common_1.NotFoundException('Usuario no encontrado en esta organización');
        }
        const { data: permission } = await client
            .from('permissions')
            .select('id, code, module, action')
            .eq('id', permissionId)
            .maybeSingle();
        if (!permission) {
            throw new common_1.NotFoundException(`El permiso con id '${permissionId}' no existe en el catálogo`);
        }
        const { data: userPermission } = await client
            .from('user_permissions')
            .select('id, granted')
            .eq('user_id', userId)
            .eq('permission_id', permissionId)
            .maybeSingle();
        if (!userPermission) {
            throw new common_1.NotFoundException(`El usuario no tiene el permiso '${permission.code}' asignado`);
        }
        if (userPermission.granted === false) {
            return {
                message: `El permiso '${permission.code}' ya estaba revocado`,
                changed: false,
            };
        }
        const { error } = await client
            .from('user_permissions')
            .update({
            granted: false,
            granted_by: revokedBy,
            granted_at: new Date().toISOString(),
        })
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        if (error) {
            this.logger.error('Error al revocar permiso:', error);
            throw new Error('No se pudo revocar el permiso');
        }
        await client
            .from('audit_logs')
            .insert({
            user_id: revokedBy,
            entity_name: 'user_permissions',
            entity_id: userId,
            action: 'UPDATE',
            old_values: {
                permission_code: permission.code,
                granted: true,
            },
            new_values: {
                permission_code: permission.code,
                granted: false,
                revoked_by: revokedBy,
            },
        });
        return {
            message: `Permiso '${permission.code}' revocado correctamente`,
            changed: true,
        };
    }
};
exports.RevokePermissionUseCase = RevokePermissionUseCase;
exports.RevokePermissionUseCase = RevokePermissionUseCase = RevokePermissionUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], RevokePermissionUseCase);
//# sourceMappingURL=revoke-permission.use-case.js.map