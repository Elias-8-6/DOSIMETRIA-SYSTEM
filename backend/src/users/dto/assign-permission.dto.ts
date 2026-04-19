import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AssignPermissionDto {
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  permission_id: string;
}
