import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { CreateDosimeterDto } from '../dto/create-dosimeter.dto';

@Injectable()
export class CreateDosimeterUseCase {
  private readonly logger = new Logger(CreateDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(dto: CreateDosimeterDto, organizationId: string, requestingUserId: string) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede registrar dosímetros');
    }

    const client = this.supabase.getClient();

    const { data: existingSerial } = await client
      .from('dosimeters')
      .select('id')
      .eq('serial_number', dto.serial_number)
      .maybeSingle();

    if (existingSerial) {
      throw new ConflictException(
        `Ya existe un dosímetro con el número de serie '${dto.serial_number}'`,
      );
    }

    if (dto.internal_code) {
      const { data: existingCode } = await client
        .from('dosimeters')
        .select('id')
        .eq('internal_code', dto.internal_code)
        .maybeSingle();

      if (existingCode) {
        throw new ConflictException(`El código interno '${dto.internal_code}' ya está en uso`);
      }
    }

    const { data: availableStatus, error: statusError } = await client
      .from('dosimeter_statuses')
      .select('id')
      .eq('code', 'DISPONIBLE')
      .single();

    if (statusError || !availableStatus) {
      throw new Error('No se pudo resolver el estado inicial DISPONIBLE');
    }

    const { data: newDosimeter, error } = await client
      .from('dosimeters')
      .insert({
        dosimeter_type_id: dto.dosimeter_type_id,
        status_id: availableStatus.id,
        serial_number: dto.serial_number,
        internal_code: dto.internal_code ?? null,
        lot_number: dto.lot_number ?? null,
        manufacture_date: dto.manufacture_date ?? null,
        commissioning_date: dto.commissioning_date ?? null,
        wear_period_days: dto.wear_period_days ?? null,
        max_dose_limit: dto.max_dose_limit ?? null,
        last_annealing_date: dto.last_annealing_date ?? null,
        current_condition: dto.current_condition ?? 'normal',
        reusable: dto.reusable ?? true,
        notes: dto.notes ?? null,
      })
      .select(
        `
        id, serial_number, internal_code, lot_number,
        manufacture_date, commissioning_date, wear_period_days,
        max_dose_limit, last_annealing_date, current_condition,
        reusable, notes, created_at,
        dosimeter_types(id, code, name, technology),
        dosimeter_statuses(id, code, name)
      `,
      )
      .single();

    if (error || !newDosimeter) {
      this.logger.error('Error al crear dosímetro:', error);
      if (error?.code === '23505') {
        throw new ConflictException('El número de serie o código interno ya existe.');
      }
      throw new Error('No se pudo crear el dosímetro');
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeters',
      entityId: newDosimeter.id,
      action: 'CREATE',
      newValues: {
        serial_number: newDosimeter.serial_number,
        internal_code: newDosimeter.internal_code,
      },
    });

    return newDosimeter;
  }
}
