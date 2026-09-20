import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateServiceOrderDocumentDataDto {
  @IsNotEmpty({ message: 'Los datos de documentos son obligatorios' })
  @IsObject({ message: 'Los datos de documentos deben ser un objeto válido' })
  document_data!: Record<string, any>;
}
