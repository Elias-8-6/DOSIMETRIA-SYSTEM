import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { OrganizationScopeService } from '@common/services/organization-scope.service';
import { UpdateDosimeterDto } from '../dto/update-dosimeter.dto';

@Injectable()
export class UpdateDosimeterUseCase {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async execute(
    dosimeterId: string,
    dto: UpdateDosimeterDto,
    organizationId: string,
    requestingUserId: string,
  ) {
    const orgType = await this.orgScope.getOrganizationType(organizationId);
    if (orgType !== 'laboratory') {
      throw new ForbiddenException('Solo el laboratorio puede editar dosímetros');
    }

    const supabase = this.supabase.getClient();

    const { data: existing } = await supabase
      .from('dosimeters')
      .select('id, serial_number, internal_code')
      .eq('id', dosimeterId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Dosímetro no encontrado');

    if (dto.serial_number !== undefined && dto.serial_number !== existing.serial_number) {
      const { data: conflict } = await supabase
        .from('dosimeters')
        .select('id')
        .eq('serial_number', dto.serial_number)
        .neq('id', dosimeterId)
        .maybeSingle();
      if (conflict) {
        throw new ConflictException(
          `Ya existe un dosímetro con el número de serie '${dto.serial_number}'`,
        );
      }
    }

    if (dto.internal_code !== undefined && dto.internal_code !== existing.internal_code) {
      const { data: conflict } = await supabase
        .from('dosimeters')
        .select('id')
        .eq('internal_code', dto.internal_code)
        .neq('id', dosimeterId)
        .maybeSingle();
      if (conflict) {
        throw new ConflictException(`El código interno '${dto.internal_code}' ya está en uso`);
      }
    }

    const { data, error } = await supabase
      .from('dosimeters')
      .update({
        ...(dto.serial_number !== undefined && { serial_number: dto.serial_number }),
        ...(dto.dosimeter_type_id !== undefined && { dosimeter_type_id: dto.dosimeter_type_id }),
        ...(dto.internal_code !== undefined && { internal_code: dto.internal_code }),
        ...(dto.lot_number !== undefined && { lot_number: dto.lot_number }),
        ...(dto.manufacture_date !== undefined && { manufacture_date: dto.manufacture_date }),
        ...(dto.commissioning_date !== undefined && {
          commissioning_date: dto.commissioning_date,
        }),
        ...(dto.wear_period_days !== undefined && { wear_period_days: dto.wear_period_days }),
        ...(dto.max_dose_limit !== undefined && { max_dose_limit: dto.max_dose_limit }),
        ...(dto.last_annealing_date !== undefined && {
          last_annealing_date: dto.last_annealing_date,
        }),
        ...(dto.current_condition !== undefined && { current_condition: dto.current_condition }),
        ...(dto.reusable !== undefined && { reusable: dto.reusable }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      })
      .eq('id', dosimeterId)
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

    if (error) throw new Error(error.message);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'dosimeters',
      entityId: dosimeterId,
      action: 'UPDATE',
      oldValues: { serial_number: existing.serial_number, internal_code: existing.internal_code },
      newValues: dto as unknown as Record<string, unknown>,
    });

    return data;
  }
}
