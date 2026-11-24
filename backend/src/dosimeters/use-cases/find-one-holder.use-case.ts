import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

export interface AssemblyItem {
  id: string;
  is_active: boolean;
  assembled_at: string;
  tld_cards?: Record<string, unknown> | null;
  dosimeters?: Record<string, unknown> | null;
}

@Injectable()
export class FindOneHolderUseCase {
  private readonly logger = new Logger(FindOneHolderUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  async execute(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('holder_dosimeters')
      .select(
        `
        id, barcode, serial_number, holder_color, clip_type, model, storage_location,
        current_condition, status, notes, photo_url, created_at, updated_at,
        holder_tld_assemblies(
          id, is_active, assembled_at, disassembled_at, notes,
          tld_cards(id, serial_number, elements_count, tld_material, status),
          dosimeters(id, serial_number, current_condition, model)
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error al consultar portadosímetro por ID '${id}':`, error);
      throw new Error(`Error al consultar portadosímetro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`No existe un portadosímetro con id '${id}'`);
    }

    const assemblies: AssemblyItem[] = (data.holder_tld_assemblies as unknown as AssemblyItem[]) ?? [];
    const activeAssembly = assemblies.find((a: AssemblyItem) => a.is_active);

    return {
      ...data,
      active_assembly: activeAssembly
        ? {
            assembly_id: activeAssembly.id,
            assembled_at: activeAssembly.assembled_at,
            tld_card: activeAssembly.tld_cards,
            dosimeter: activeAssembly.dosimeters,
          }
        : null,
      assembly_history: assemblies,
    };
  }
}
