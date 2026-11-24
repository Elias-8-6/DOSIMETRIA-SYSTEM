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
    if (!dto.dosimeter_id && !dto.tld_card_id) {
      throw new BadRequestException('Debe proporcionar un dosimeter_id o un tld_card_id para ensamblar.');
    }

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

    // 2. Validar Dosímetro (si aplica)
    let dosimeter: { id: string; serial_number: string; current_condition: string } | null = null;
    if (dto.dosimeter_id) {
      const { data: dos, error: dosErr } = await supabase
        .from('dosimeters')
        .select('id, serial_number, current_condition, status_id, dosimeter_statuses(code)')
        .eq('id', dto.dosimeter_id)
        .maybeSingle();

      if (dosErr || !dos) throw new NotFoundException('Dosímetro no encontrado');

      const statusCode = (dos.dosimeter_statuses as { code?: string } | null)?.code;
      if (statusCode && statusCode !== 'DISPONIBLE') {
        throw new ConflictException(
          `El dosímetro '${dos.serial_number}' no está disponible para ensamble (estado: ${statusCode})`,
        );
      }

      if (['danado', 'contaminado', 'perdido'].includes(dos.current_condition)) {
        throw new BadRequestException(
          `El dosímetro presenta condición crítica (${dos.current_condition}) y no puede ensamblarse`,
        );
      }

      dosimeter = { id: dos.id, serial_number: dos.serial_number, current_condition: dos.current_condition };
    }

    // 3. Validar tarjeta TLD (si aplica)
    let tldCard: { id: string; serial_number: string } | null = null;
    if (dto.tld_card_id) {
      const { data: card, error: tldErr } = await supabase
        .from('tld_cards')
        .select('id, serial_number, status')
        .eq('id', dto.tld_card_id)
        .maybeSingle();

      if (tldErr || !card) throw new NotFoundException('Tarjeta TLD no encontrada');

      if (card.status !== 'disponible') {
        throw new ConflictException(
          `La tarjeta TLD '${card.serial_number}' no está disponible (estado actual: ${card.status})`,
        );
      }
      tldCard = card;
    }

    // 4. Validar que ninguna parte esté en un ensamble activo
    const { data: activeHolder } = await supabase
      .from('holder_tld_assemblies')
      .select('id')
      .eq('holder_id', dto.holder_id)
      .eq('is_active', true)
      .maybeSingle();

    if (activeHolder) {
      throw new ConflictException('El portadosímetro ya tiene un ensamble activo');
    }

    if (dto.dosimeter_id) {
      const { data: activeDos } = await supabase
        .from('holder_tld_assemblies')
        .select('id')
        .eq('dosimeter_id', dto.dosimeter_id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeDos) {
        throw new ConflictException('El dosímetro ya tiene un portadosímetro ensamblado');
      }
    }

    if (dto.tld_card_id) {
      const { data: activeTld } = await supabase
        .from('holder_tld_assemblies')
        .select('id')
        .eq('tld_card_id', dto.tld_card_id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeTld) {
        throw new ConflictException('La tarjeta TLD ya está ensamblada en otro portadosímetro');
      }
    }

    // 5. Registrar ensamble 1:1
    const { data: assembly, error: assemblyErr } = await supabase
      .from('holder_tld_assemblies')
      .insert({
        holder_id: dto.holder_id,
        dosimeter_id: dto.dosimeter_id ?? null,
        tld_card_id: dto.tld_card_id ?? null,
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

    // 6. Actualizar estados
    await supabase
      .from('holder_dosimeters')
      .update({ status: 'ensamblado' })
      .eq('id', dto.holder_id);

    if (dto.tld_card_id) {
      await supabase
        .from('tld_cards')
        .update({ status: 'ensamblado' })
        .eq('id', dto.tld_card_id);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_tld_assemblies',
      entityId: assembly.id,
      action: 'CREATE',
      newValues: {
        holder_barcode: holder.barcode,
        dosimeter_serial: dosimeter?.serial_number ?? null,
        tld_serial: tldCard?.serial_number ?? null,
        is_active: true,
      },
    });

    return {
      message: 'Dosímetro ensamblado exitosamente',
      assembly_id: assembly.id,
      holder: { id: holder.id, barcode: holder.barcode, serial_number: holder.serial_number },
      dosimeter: dosimeter ? { id: dosimeter.id, serial_number: dosimeter.serial_number } : null,
      tld_card: tldCard ? { id: tldCard.id, serial_number: tldCard.serial_number } : null,
      assembled_at: assembly.assembled_at,
    };
  }
}
