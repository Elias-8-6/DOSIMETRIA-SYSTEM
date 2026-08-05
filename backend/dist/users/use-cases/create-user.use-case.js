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
var CreateUserUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserUseCase = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const supabase_config_1 = require("../../config/supabase.config");
let CreateUserUseCase = CreateUserUseCase_1 = class CreateUserUseCase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(CreateUserUseCase_1.name);
    }
    async execute(dto, organizationId, grantedBy) {
        const client = this.supabase.getClient();
        const { data: existingUser } = await client
            .from("users")
            .select("id")
            .eq("email", dto.email)
            .eq("organization_id", organizationId)
            .maybeSingle();
        if (existingUser) {
            throw new common_1.ConflictException(`El email '${dto.email}' ya está registrado en esta organización`);
        }
        let roleId = null;
        if (dto.role_code) {
            const { data: role } = await client
                .from("roles")
                .select("id")
                .eq("code", dto.role_code)
                .maybeSingle();
            if (!role) {
                throw new common_1.NotFoundException(`El rol '${dto.role_code}' no existe en el sistema`);
            }
            roleId = role.id;
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const { data: newUser, error: createError } = await client
            .from("users")
            .insert({
            full_name: dto.full_name,
            email: dto.email,
            password_hash: passwordHash,
            organization_id: organizationId,
            status: "active",
        })
            .select("id, full_name, email, status, organization_id, created_at")
            .single();
        if (createError || !newUser) {
            this.logger.error("Error al crear usuario:", createError);
            throw new Error("No se pudo crear el usuario");
        }
        if (roleId) {
            const { error: roleError } = await client.from("user_roles").insert({
                user_id: newUser.id,
                role_id: roleId,
            });
            if (roleError) {
                this.logger.error("Error al asignar rol:", roleError);
            }
        }
        await client.from("audit_logs").insert({
            user_id: grantedBy,
            entity_name: "users",
            entity_id: newUser.id,
            action: "UPDATE",
            old_values: null,
            new_values: {
                full_name: newUser.full_name,
                email: newUser.email,
                status: newUser.status,
                role_code: dto.role_code ?? null,
            },
        });
        return {
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            status: newUser.status,
            created_at: newUser.created_at,
            role_code: dto.role_code ?? null,
        };
    }
};
exports.CreateUserUseCase = CreateUserUseCase;
exports.CreateUserUseCase = CreateUserUseCase = CreateUserUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], CreateUserUseCase);
//# sourceMappingURL=create-user.use-case.js.map