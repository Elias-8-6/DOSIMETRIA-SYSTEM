import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';

@Injectable()
export class ValidateHolderBarcodeUseCase {
  private readonly logger = new Logger(ValidateHolderBarcodeUseCase.name);

  constructor(private readonly supabase: SupabaseService) {}

  async execute(barcode: string) {
    const cleanBarcode = (barcode || '').trim();
    if (!cleanBarcode) {
      return {
        exists: false,
        holder: null,
        message: 'Código de barras no proporcionado',
      };
    }

    const supabase = this.supabase.getClient();

    // 1. Consulta base segura de columnas garantizadas en holder_dosimeters
    const { data: holder, error } = await supabase
      .from('holder_dosimeters')
      .select('id, barcode, serial_number, holder_color, clip_type, model, storage_location, current_condition, status, notes, photo_url, created_at, updated_at')
      .eq('barcode', cleanBarcode)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error consultando holder_dosimeters por barcode '${cleanBarcode}':`, error);
      throw new Error(`Error en base de datos al validar código de barras: ${error.message}`);
    }

    if (!holder) {
      return {
        exists: false,
        holder: null,
        message: `El código de barras '${cleanBarcode}' está disponible para registro.`,
      };
    }

    // 2. Consulta opcional y protegida del ensamble activo (si existe)
    let activeAssembly: {
      assembly_id: string;
      assembled_at: string;
      tld_card?: unknown;
      dosimeter?: unknown;
    } | null = null;
    try {
      const { data: assemblyData } = await supabase
        .from('holder_tld_assemblies')
        .select(`
          id, is_active, assembled_at,
          tld_cards(id, serial_number, elements_count, tld_material, status),
          dosimeters(id, serial_number, current_condition, model)
        `)
        .eq('holder_id', holder.id)
        .eq('is_active', true)
        .maybeSingle();

      if (assemblyData) {
        activeAssembly = {
          assembly_id: assemblyData.id,
          assembled_at: assemblyData.assembled_at,
          tld_card: assemblyData.tld_cards,
          dosimeter: assemblyData.dosimeters,
        };
      }
    } catch (assemblyErr) {
      this.logger.warn(`No se pudo cargar ensamble activo para holder ${holder.id}:`, assemblyErr);
    }

    return {
      exists: true,
      holder: {
        ...holder,
        active_assembly: activeAssembly,
      },
      message: `El portadosímetro con código de barras '${cleanBarcode}' ya existe en el sistema.`,
    };
  }
}
