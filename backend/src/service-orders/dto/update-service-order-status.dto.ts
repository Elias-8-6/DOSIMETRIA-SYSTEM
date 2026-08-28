import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateServiceOrderStatusDto {
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  @IsIn(['PENDING', 'RECEIVED', 'IN_PROCESS', 'QC_REVIEW', 'COMPLETED'])
  status!: string;
}
