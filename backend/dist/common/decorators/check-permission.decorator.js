"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckPermission = exports.CHECK_PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CHECK_PERMISSION_KEY = "check_permission";
const CheckPermission = (module, action) => (0, common_1.SetMetadata)(exports.CHECK_PERMISSION_KEY, { module, action });
exports.CheckPermission = CheckPermission;
//# sourceMappingURL=check-permission.decorator.js.map