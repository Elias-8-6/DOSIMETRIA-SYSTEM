import { SupabaseService } from '@config/supabase.config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { FindOneUserUseCase } from './use-cases/find-one-user.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeactivateUserUseCase } from './use-cases/deactivate-user.use-case';
import { AssignPermissionUseCase } from './use-cases/assign-permission.use-case';
import { RevokePermissionUseCase } from './use-cases/revoke-permission.use-case';
export declare class UsersService {
    private readonly supabase;
    private readonly findAllUsersUseCase;
    private readonly findOneUserUseCase;
    private readonly createUserUseCase;
    private readonly updateUserUseCase;
    private readonly deactivateUserUseCase;
    private readonly assignPermissionUseCase;
    private readonly revokePermissionUseCase;
    constructor(supabase: SupabaseService, findAllUsersUseCase: FindAllUsersUseCase, findOneUserUseCase: FindOneUserUseCase, createUserUseCase: CreateUserUseCase, updateUserUseCase: UpdateUserUseCase, deactivateUserUseCase: DeactivateUserUseCase, assignPermissionUseCase: AssignPermissionUseCase, revokePermissionUseCase: RevokePermissionUseCase);
    findAll(organizationId: string, search?: string, status?: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
    }[]>;
    findOne(userId: string, organizationId: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
        permissions: any[];
    }>;
    findAllPermissions(): Promise<{
        id: any;
        code: any;
        module: any;
        action: any;
        description: any;
    }[]>;
    create(dto: CreateUserDto, organizationId: string, grantedBy: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        role_code: string;
    }>;
    update(userId: string, dto: UpdateUserDto, organizationId: string, requestingUserId: string): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
    }>;
    updateStatus(userId: string, dto: UpdateUserStatusDto, organizationId: string, requestingUserId: string): Promise<{
        id: any;
        status: any;
        message: string;
        full_name?: undefined;
        email?: undefined;
    } | {
        id: any;
        full_name: any;
        email: any;
        status: any;
        message?: undefined;
    }>;
    assignPermission(userId: string, dto: AssignPermissionDto, organizationId: string, grantedBy: string): Promise<{
        message: string;
        permission: {
            id: any;
            code: any;
            module: any;
            action: any;
            description: any;
        };
        changed: boolean;
    }>;
    revokePermission(userId: string, permissionId: string, organizationId: string, revokedBy: string): Promise<{
        message: string;
        changed: boolean;
    }>;
}
