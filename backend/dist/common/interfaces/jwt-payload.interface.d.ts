export interface JwtPayload {
    sub: string;
    email: string;
    full_name: string;
    organization_id: string;
    active_role: string;
    iat?: number;
    exp?: number;
}
export declare enum Role {
    ADMIN_LAB = "admin_lab",
    TECNICO_LAB = "tecnico_lab",
    COORDINADOR_CLIENTE = "coordinador_cliente",
    AUDITOR = "auditor"
}
