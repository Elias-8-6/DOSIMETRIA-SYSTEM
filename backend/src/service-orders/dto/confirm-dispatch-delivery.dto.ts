import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmDispatchDeliveryDto {
  @IsNotEmpty({ message: 'El nombre del receptor en la institución es obligatorio' })
  @IsString()
  @MaxLength(100)
  client_receiver_name!: string;

  @IsOptional()
  @IsString()
  client_signature_url?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
