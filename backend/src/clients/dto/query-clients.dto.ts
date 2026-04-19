import { IsEnum, IsString, IsOptional} from 'class-validator';


enum ClientStatusFilter {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export class QueryClientsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(ClientStatusFilter)
    statusFilter?: ClientStatusFilter;
}