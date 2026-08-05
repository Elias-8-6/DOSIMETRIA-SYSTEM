declare enum UserStatusFilter {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class QueryUsersDto {
    search?: string;
    status?: UserStatusFilter;
}
export {};
