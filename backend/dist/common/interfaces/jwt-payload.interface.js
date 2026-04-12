"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionAction = exports.PermissionModule = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN_LAB"] = "admin_lab";
    Role["TECNICO_LAB"] = "tecnico_lab";
    Role["COORDINADOR_CLIENTE"] = "coordinador_cliente";
    Role["AUDITOR"] = "auditor";
})(Role || (exports.Role = Role = {}));
var PermissionModule;
(function (PermissionModule) {
    PermissionModule["USERS"] = "users";
    PermissionModule["CLIENTS"] = "clients";
    PermissionModule["WORKERS"] = "workers";
    PermissionModule["DOSIMETERS"] = "dosimeters";
    PermissionModule["ASSIGNMENTS"] = "assignments";
    PermissionModule["SERVICE_ORDERS"] = "service_orders";
    PermissionModule["RECEPTIONS"] = "receptions";
    PermissionModule["LAB_PROCESS"] = "lab_process";
    PermissionModule["READINGS"] = "readings";
    PermissionModule["REPORTS"] = "reports";
    PermissionModule["EQUIPMENT"] = "equipment";
    PermissionModule["AUDIT"] = "audit";
})(PermissionModule || (exports.PermissionModule = PermissionModule = {}));
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["CREATE"] = "create";
    PermissionAction["READ"] = "read";
    PermissionAction["UPDATE"] = "update";
    PermissionAction["DELETE"] = "delete";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
//# sourceMappingURL=jwt-payload.interface.js.map