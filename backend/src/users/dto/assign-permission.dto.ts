import { IsNotEmpty, IsString } from 'class-validator';
import { IsUUID } from '@common/validators/is-uuid.validator';

export class AssignPermissionDto {
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  permission_id!: string;
}
