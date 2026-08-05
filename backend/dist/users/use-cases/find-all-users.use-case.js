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
exports.FindAllUsersUseCase = void 0;
const common_1 = require("@nestjs/common");
const supabase_config_1 = require("../../config/supabase.config");
let FindAllUsersUseCase = class FindAllUsersUseCase {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async execute(organizationId, search, status) {
        const client = this.supabase.getClient();
        let query = client
            .from('users')
            .select(`id, full_name, email, status, created_at,
             user_roles( roles(code, name) )`)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data: users, error } = await query;
        if (error) {
            throw new Error('No se pudo obtener el listado de usuarios');
        }
        return (users ?? []).map((user) => ({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            status: user.status,
            created_at: user.created_at,
            roles: user.user_roles.map((ur) => ur.roles),
        }));
    }
};
exports.FindAllUsersUseCase = FindAllUsersUseCase;
exports.FindAllUsersUseCase = FindAllUsersUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_config_1.SupabaseService])
], FindAllUsersUseCase);
//# sourceMappingURL=find-all-users.use-case.js.map