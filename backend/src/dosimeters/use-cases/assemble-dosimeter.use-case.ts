import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { AssembleDosimeterDto } from '../dto/assemble-dosimeter.dto';

@Injectable()
export class AssembleDosimeterUseCase {
  private readonly logger = new Logger(AssembleDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: AssembleDosimeterDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. Validar portadosímetro
    const { data: holder, error: holderErr } = await supabase
      .from('holder_dosimeters')
      .select('id, barcode, serial_number, status, current_condition')
      .eq('id', dto.holder_id)
      .maybeSingle();

    if (holderErr || !holder) throw new NotFoundException('Portadosímetro no encontrado');

    if (holder.status !== 'disponible') {
      throw new ConflictException(
        `El portadosímetro '${holder.barcode}' no está disponible (estado actual: ${holder.status})`,
      );
    }

    if (['danado_grave', 'contaminado', 'perdido'].includes(holder.current_condition)) {
      throw new BadRequestException(
        `El portadosímetro presenta condición crítica (${holder.current_condition}) y no puede ensamblarse`,
      );
    }

    // 2. Validar tarjeta TLD
    const { data: tldCard, error: tldErr } = await supabase
      .from('tld_cards')
      .select('id, serial_number, status')
      .eq('id', dto.tld_card_id)
      .maybeSingle();

    if (tldErr || !tldCard) throw new NotFoundException('Tarjeta TLD no encontrada');

    if (tldCard.status !== 'disponible') {
      throw new ConflictException(
        `La tarjeta TLD '${tldCard.serial_number}' no está disponible (estado actual: ${tldCard.status})`,
      );
    }

    // 3. Validar que ninguna parte esté en un ensamble activo
    const { data: activeHolder } = await supabase
      .from('holder_tld_assemblies')
      .select('id')
      .eq('holder_id', dto.holder_id)
      .eq('is_active', true)
      .maybeSingle();

    if (activeHolder) {
      throw new ConflictException('El portadosímetro ya tiene un ensamble activo');
    }

    const { data: activeTld } = await supabase
      .from('holder_tld_assemblies')
      .select('id')
      .eq('tld_card_id', dto.tld_card_id)
      .eq('is_active', true)
      .maybeSingle();

    if (activeTld) {
      throw new ConflictException('La tarjeta TLD ya está ensamblada en otro portadosímetro');
    }

    // 4. Registrar ensamble 1:1
    const { data: assembly, error: assemblyErr } = await supabase
      .from('holder_tld_assemblies')
      .insert({
        holder_id: dto.holder_id,
        tld_card_id: dto.tld_card_id,
        assembled_by: requestingUserId,
        is_active: true,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (assemblyErr || !assembly) {
      this.logger.error('Error al registrar ensamble:', assemblyErr);
      throw new Error(`No se pudo crear el ensamble: ${assemblyErr?.message}`);
    }

    // 5. Actualizar estados a 'ensamblado'
    await supabase
      .from('holder_dosimeters')
      .update({ status: 'ensamblado' })
      .eq('id', dto.holder_id);

    await supabase
      .from('tld_cards')
      .update({ status: 'ensamblado' })
      .eq('id', dto.tld_card_id);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_tld_assemblies',
      entityId: assembly.id,
      action: 'CREATE',
      newValues: {
        holder_barcode: holder.barcode,
        tld_serial: tldCard.serial_number,
        is_active: true,
      },
    });

    return {
      message: 'Dosímetro ensamblado exitosamente',
      assembly_id: assembly.id,
      holder: { id: holder.id, barcode: holder.barcode, serial_number: holder.serial_number },
      tld_card: { id: tldCard.id, serial_number: tldCard.serial_number },
      assembled_at: assembly.assembled_at,
    };
  }
}
