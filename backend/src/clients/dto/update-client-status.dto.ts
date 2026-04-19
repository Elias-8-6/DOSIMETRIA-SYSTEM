import {IsEnum, IsNotEmpty} from 'class-validator';

enum ClientStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export class UpdateClientStatusDto {
    @IsNotEmpty()
    @IsEnum(ClientStatus, {message: 'El estado del cliente solo puede ser activo o inactivo'})
    status: ClientStatus;
}