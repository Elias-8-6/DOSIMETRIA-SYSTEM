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
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const supabase_config_1 = require("../../config/supabase.config");
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(supabase) {
        this.supabase = supabase;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return next.handle().pipe((0, rxjs_1.tap)(async (response) => {
            if (!response?._audit)
                return;
            const { entity, entityId, action, oldValues, newValues } = response._audit;
            try {
                await this.supabase.getClient().from('audit_logs').insert({
                    user_id: user?.sub ?? null,
                    active_role: user?.active_role ?? null,
                    entity_name: entity,
                    entity_id: entityId ?? null,
                    action,
                    old_values: oldValues ?? null,
                    new_values: newValues ?? null,
                });
            }
            catch (err) {
                console.error('[AuditLog] Error al registrar:', err);
            }
        }));
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map