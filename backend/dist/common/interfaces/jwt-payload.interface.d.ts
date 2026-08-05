export interface JwtPayload {
    sub: string;
    email: string;
    full_name: string;
    organization_id: string;
    iat?: number;
    exp?: number;
}
export declare enum Role {
    ADMIN_LAB = "admin_lab",
    TECNICO_LAB = "tecnico_lab",
    COORDINADOR_CLIENTE = "coordinador_cliente",
    AUDITOR = "auditor"
}
export declare enum PermissionModule {
    USERS = "users",
    CLIENTS = "clients",
    WORKERS = "workers",
    DOSIMETERS = "dosimeters",
    ASSIGNMENTS = "assignments",
    SERVICE_ORDERS = "service_orders",
    RECEPTIONS = "receptions",
    LAB_PROCESS = "lab_process",
    READINGS = "readings",
    REPORTS = "reports",
    EQUIPMENT = "equipment",
    AUDIT = "audit"
}
export declare enum PermissionAction {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete"
}
