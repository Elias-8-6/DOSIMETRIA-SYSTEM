"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
const find_all_users_use_case_1 = require("./use-cases/find-all-users.use-case");
const find_one_user_use_case_1 = require("./use-cases/find-one-user.use-case");
const create_user_use_case_1 = require("./use-cases/create-user.use-case");
const update_user_use_case_1 = require("./use-cases/update-user.use-case");
const deactivate_user_use_case_1 = require("./use-cases/deactivate-user.use-case");
const assign_permission_use_case_1 = require("./use-cases/assign-permission.use-case");
const revoke_permission_use_case_1 = require("./use-cases/revoke-permission.use-case");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        controllers: [users_controller_1.UsersController],
        providers: [
            users_service_1.UsersService,
            find_all_users_use_case_1.FindAllUsersUseCase,
            find_one_user_use_case_1.FindOneUserUseCase,
            create_user_use_case_1.CreateUserUseCase,
            update_user_use_case_1.UpdateUserUseCase,
            deactivate_user_use_case_1.DeactivateUserUseCase,
            assign_permission_use_case_1.AssignPermissionUseCase,
            revoke_permission_use_case_1.RevokePermissionUseCase,
        ],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map