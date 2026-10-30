import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateTldCardDto } from '../dto/create-tld-card.dto';

@Injectable()
export class CreateTldCardUseCase {
  private readonly logger = new Logger(CreateTldCardUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateTldCardDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // Validar unicidad de número de serie de la tarjeta TLD
    const { data: existing } = await supabase
      .from('tld_cards')
      .select('id')
      .eq('serial_number', dto.serial_number)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Ya existe una tarjeta TLD con el número de serie '${dto.serial_number}'`);
    }

    const { data: newCard, error } = await supabase
      .from('tld_cards')
      .insert({
        serial_number: dto.serial_number,
        elements_count: dto.elements_count,
        tld_material: dto.tld_material ?? 'LiF:Mg,Ti',
        annealing_cycles_count: 0,
        status: 'disponible',
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error || !newCard) {
      this.logger.error('Error al registrar tarjeta TLD:', error);
      throw new Error(`No se pudo crear la tarjeta TLD: ${error?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'tld_cards',
      entityId: newCard.id,
      action: 'CREATE',
      newValues: {
        serial_number: newCard.serial_number,
        elements_count: newCard.elements_count,
        status: newCard.status,
      },
    });

    return newCard;
  }
}
