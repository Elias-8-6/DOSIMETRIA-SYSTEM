import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { DisassembleDosimeterDto } from '../dto/disassemble-dosimeter.dto';

@Injectable()
export class DisassembleDosimeterUseCase {
  private readonly logger = new Logger(DisassembleDosimeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: DisassembleDosimeterDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // 1. Buscar ensamble activo por id de ensamble o por id de portadosímetro
    let { data: assembly, error } = await supabase
      .from('holder_tld_assemblies')
      .select('id, holder_id, tld_card_id, is_active')
      .eq('id', dto.assembly_id)
      .maybeSingle();

    if (!assembly) {
      // Buscar si el ID pasado es el del portadosímetro
      const { data: byHolder } = await supabase
        .from('holder_tld_assemblies')
        .select('id, holder_id, tld_card_id, is_active')
        .eq('holder_id', dto.assembly_id)
        .eq('is_active', true)
        .maybeSingle();

      assembly = byHolder;
    }

    if (!assembly) {
      throw new NotFoundException('No se encontró un ensamble activo con el identificador proporcionado');
    }

    if (!assembly.is_active) {
      throw new BadRequestException('El ensamble ya se encuentra desarmado');
    }

    const holderTargetStatus = dto.holder_target_status ?? 'disponible';
    const tldTargetStatus = dto.tld_target_status ?? 'disponible';

    // 2. Cerrar ensamble
    const now = new Date().toISOString();
    const { error: updateAssemblyErr } = await supabase
      .from('holder_tld_assemblies')
      .update({
        is_active: false,
        disassembled_at: now,
        disassembled_by: requestingUserId,
        notes: dto.reason ? `Desensamble: ${dto.reason}` : null,
      })
      .eq('id', assembly.id);

    if (updateAssemblyErr) {
      this.logger.error('Error al desarmar ensamble:', updateAssemblyErr);
      throw new Error(`Error al actualizar ensamble: ${updateAssemblyErr.message}`);
    }

    // 3. Actualizar estados independientes de cada pieza
    await supabase
      .from('holder_dosimeters')
      .update({ status: holderTargetStatus })
      .eq('id', assembly.holder_id);

    await supabase
      .from('tld_cards')
      .update({ status: tldTargetStatus })
      .eq('id', assembly.tld_card_id);

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'holder_tld_assemblies',
      entityId: assembly.id,
      action: 'UPDATE',
      oldValues: { is_active: true },
      newValues: {
        is_active: false,
        disassembled_at: now,
        holder_target_status: holderTargetStatus,
        tld_target_status: tldTargetStatus,
      },
    });

    return {
      message: 'Dosímetro desarmado exitosamente',
      assembly_id: assembly.id,
      holder_id: assembly.holder_id,
      tld_card_id: assembly.tld_card_id,
      disassembled_at: now,
      holder_status: holderTargetStatus,
      tld_status: tldTargetStatus,
    };
  }
}
