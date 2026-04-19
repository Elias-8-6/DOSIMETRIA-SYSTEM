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
var DeactivateUserUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeactivateUserUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let DeactivateUserUseCase = DeactivateUserUseCase_1 = class DeactivateUserUseCase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(DeactivateUserUseCase_1.name);
    }
    async execute(userId, dto, organizationId, requestingUserId) {
        const client = this.supabase.getClient();
        if (userId === requestingUserId) {
            throw new common_1.BadRequestException('No podés cambiar el estado de tu propio usuario');
        }
        const { data: existingUser } = await client
            .from('users')
            .select('id, full_name, email, status')
            .eq('id', userId)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (!existingUser) {
            throw new common_1.NotFoundException('Usuario no encontrado en esta organización');
        }
        if (existingUser.status === dto.status) {
            return {
                id: existingUser.id,
                status: existingUser.status,
                message: `El usuario ya tiene status '${dto.status}'`,
            };
        }
        const { data: updatedUser, error } = await client
            .from('users')
            .update({ status: dto.status })
            .eq('id', userId)
            .select('id, full_name, email, status')
            .single();
        if (error || !updatedUser) {
            this.logger.error('Error al actualizar status:', error);
            throw new Error('No se pudo actualizar el status del usuario');
        }
        await client
            .from('audit_logs')
            .insert({
            user_id: requestingUserId,
            entity_name: 'users',
            entity_id: userId,
            action: 'STATUS_CHANGE',
            old_values: { status: existingUser.status },
            new_values: { status: dto.status },
        });
        return {
            id: updatedUser.id,
            full_name: updatedUser.full_name,
            email: updatedUser.email,
            status: updatedUser.status,
        };
    }
};
exports.DeactivateUserUseCase = DeactivateUserUseCase;
exports.DeactivateUserUseCase = DeactivateUserUseCase = DeactivateUserUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], DeactivateUserUseCase);
//# sourceMappingURL=deactivate-user.use-case.js.map