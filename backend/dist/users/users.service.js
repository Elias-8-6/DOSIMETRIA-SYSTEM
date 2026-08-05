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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../config/supabase.config");
const find_all_users_use_case_1 = require("./use-cases/find-all-users.use-case");
const find_one_user_use_case_1 = require("./use-cases/find-one-user.use-case");
const create_user_use_case_1 = require("./use-cases/create-user.use-case");
const update_user_use_case_1 = require("./use-cases/update-user.use-case");
const deactivate_user_use_case_1 = require("./use-cases/deactivate-user.use-case");
const assign_permission_use_case_1 = require("./use-cases/assign-permission.use-case");
const revoke_permission_use_case_1 = require("./use-cases/revoke-permission.use-case");
let UsersService = class UsersService {
    constructor(supabase, findAllUsersUseCase, findOneUserUseCase, createUserUseCase, updateUserUseCase, deactivateUserUseCase, assignPermissionUseCase, revokePermissionUseCase) {
        this.supabase = supabase;
        this.findAllUsersUseCase = findAllUsersUseCase;
        this.findOneUserUseCase = findOneUserUseCase;
        this.createUserUseCase = createUserUseCase;
        this.updateUserUseCase = updateUserUseCase;
        this.deactivateUserUseCase = deactivateUserUseCase;
        this.assignPermissionUseCase = assignPermissionUseCase;
        this.revokePermissionUseCase = revokePermissionUseCase;
    }
    findAll(organizationId, search, status) {
        return this.findAllUsersUseCase.execute(organizationId, search, status);
    }
    findOne(userId, organizationId) {
        return this.findOneUserUseCase.execute(userId, organizationId);
    }
    async findAllPermissions() {
        const { data, error } = await this.supabase.getClient()
            .from('permissions')
            .select('id, code, module, action, description')
            .order('module', { ascending: true })
            .order('action', { ascending: true });
        if (error) {
            throw new Error('No se pudo obtener el catálogo de permisos');
        }
        return data ?? [];
    }
    create(dto, organizationId, grantedBy) {
        return this.createUserUseCase.execute(dto, organizationId, grantedBy);
    }
    update(userId, dto, organizationId, requestingUserId) {
        return this.updateUserUseCase.execute(userId, dto, organizationId, requestingUserId);
    }
    updateStatus(userId, dto, organizationId, requestingUserId) {
        return this.deactivateUserUseCase.execute(userId, dto, organizationId, requestingUserId);
    }
    assignPermission(userId, dto, organizationId, grantedBy) {
        return this.assignPermissionUseCase.execute(userId, dto, organizationId, grantedBy);
    }
    revokePermission(userId, permissionId, organizationId, revokedBy) {
        return this.revokePermissionUseCase.execute(userId, permissionId, organizationId, revokedBy);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService,
        find_all_users_use_case_1.FindAllUsersUseCase,
        find_one_user_use_case_1.FindOneUserUseCase,
        create_user_use_case_1.CreateUserUseCase,
        update_user_use_case_1.UpdateUserUseCase,
        deactivate_user_use_case_1.DeactivateUserUseCase,
        assign_permission_use_case_1.AssignPermissionUseCase,
        revoke_permission_use_case_1.RevokePermissionUseCase])
], UsersService);
//# sourceMappingURL=users.service.js.map