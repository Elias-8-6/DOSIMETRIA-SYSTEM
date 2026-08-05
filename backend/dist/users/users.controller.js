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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const update_user_status_dto_1 = require("./dto/update-user-status.dto");
const assign_permission_dto_1 = require("./dto/assign-permission.dto");
const jwt_guard_1 = require("../common/guards/jwt.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const check_permission_decorator_1 = require("../common/decorators/check-permission.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const query_users_dto_1 = require("./dto/query-users.dto");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    findAllPermissions() {
        return this.usersService.findAllPermissions();
    }
    findAll(user, query) {
        return this.usersService.findAll(user.organization_id, query.search, query.status);
    }
    findOne(id, user) {
        return this.usersService.findOne(id, user.organization_id);
    }
    create(dto, user) {
        return this.usersService.create(dto, user.organization_id, user.sub);
    }
    update(id, dto, user) {
        return this.usersService.update(id, dto, user.organization_id, user.sub);
    }
    updateStatus(id, dto, user) {
        return this.usersService.updateStatus(id, dto, user.organization_id, user.sub);
    }
    assignPermission(id, dto, user) {
        return this.usersService.assignPermission(id, dto, user.organization_id, user.sub);
    }
    revokePermission(id, permissionId, user) {
        return this.usersService.revokePermission(id, permissionId, user.organization_id, user.sub);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('permissions'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAllPermissions", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_users_dto_1.QueryUsersDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'read'),
    __param(0, (0, common_1.Param)('full_name', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'update'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'update'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_status_dto_1.UpdateUserStatusDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('users/:id/permissions'),
    (0, check_permission_decorator_1.CheckPermission)('users', 'update'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_permission_dto_1.AssignPermissionDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "assignPermission", null);
__decorate([
    (0, common_1.Delete)('users/:id/permissions/:permissionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, check_permission_decorator_1.CheckPermission)('users', 'update'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('permissionId', common_1.ParseUUIDPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "revokePermission", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map