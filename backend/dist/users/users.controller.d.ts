import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { QueryUsersDto } from "./dto/query-users.dto";
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllPermissions(): Promise<{
        id: any;
        code: any;
        module: any;
        action: any;
        description: any;
    }[]>;
    findAll(user: JwtPayload, query: QueryUsersDto): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
    }[]>;
    findOne(id: string, user: JwtPayload): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        roles: any[];
        permissions: any[];
    }>;
    create(dto: CreateUserDto, user: JwtPayload): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
        role_code: string;
    }>;
    update(id: string, dto: UpdateUserDto, user: JwtPayload): Promise<{
        id: any;
        full_name: any;
        email: any;
        status: any;
        created_at: any;
    }>;
    updateStatus(id: string, dto: UpdateUserStatusDto, user: JwtPayload): Promise<{
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
    assignPermission(id: string, dto: AssignPermissionDto, user: JwtPayload): Promise<{
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
    revokePermission(id: string, permissionId: string, user: JwtPayload): Promise<{
        message: string;
        changed: boolean;
    }>;
}
