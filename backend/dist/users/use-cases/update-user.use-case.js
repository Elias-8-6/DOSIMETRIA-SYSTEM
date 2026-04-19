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
var UpdateUserUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let UpdateUserUseCase = UpdateUserUseCase_1 = class UpdateUserUseCase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(UpdateUserUseCase_1.name);
    }
    async execute(userId, dto, organizationId, requestingUserId) {
        const client = this.supabase.getClient();
        const { data: existingUser } = await client
            .from('users')
            .select('id, full_name, email, status')
            .eq('id', userId)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (!existingUser) {
            throw new common_1.NotFoundException('Usuario no encontrado en esta organización');
        }
        if (dto.email && dto.email !== existingUser.email) {
            const { data: emailTaken } = await client
                .from('users')
                .select('id')
                .eq('email', dto.email)
                .eq('organization_id', organizationId)
                .neq('id', userId)
                .maybeSingle();
            if (emailTaken) {
                throw new common_1.ConflictException(`El email '${dto.email}' ya está en uso en esta organización`);
            }
        }
        const updateData = {};
        if (dto.full_name !== undefined)
            updateData.full_name = dto.full_name;
        if (dto.email !== undefined)
            updateData.email = dto.email;
        if (Object.keys(updateData).length === 0) {
            throw new common_1.BadRequestException('No hay campos para actualizar — enviá al menos full_name o email');
        }
        const { data: updatedUser, error } = await client
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select('id, full_name, email, status, created_at')
            .single();
        if (error || !updatedUser) {
            this.logger.error('Error al actualizar usuario:', error);
            throw new Error('No se pudo actualizar el usuario');
        }
        await client
            .from('audit_logs')
            .insert({
            user_id: requestingUserId,
            entity_name: 'users',
            entity_id: userId,
            action: 'UPDATE',
            old_values: {
                full_name: existingUser.full_name,
                email: existingUser.email,
            },
            new_values: updateData,
        });
        return updatedUser;
    }
};
exports.UpdateUserUseCase = UpdateUserUseCase;
exports.UpdateUserUseCase = UpdateUserUseCase = UpdateUserUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], UpdateUserUseCase);
//# sourceMappingURL=update-user.use-case.js.map