export declare const CHECK_PERMISSION_KEY = "check_permission";
export interface RequiredPermission {
    module: string;
    action: "create" | "read" | "update" | "delete";
}
export declare const CheckPermission: (module: string, action: "create" | "read" | "update" | "delete") => import("@nestjs/common").CustomDecorator<string>;
