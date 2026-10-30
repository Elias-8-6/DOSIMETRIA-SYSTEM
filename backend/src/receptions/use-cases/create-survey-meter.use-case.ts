import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import { AuditService } from '@common/services/audit.service';
import { CreateSurveyMeterDto } from '../dto/create-survey-meter.dto';

@Injectable()
export class CreateSurveyMeterUseCase {
  private readonly logger = new Logger(CreateSurveyMeterUseCase.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: CreateSurveyMeterDto, requestingUserId: string) {
    const supabase = this.supabase.getClient();

    // Validar serie única
    const { data: existing } = await supabase
      .from('radiation_survey_meters')
      .select('id')
      .eq('serial_number', dto.serial_number)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Ya existe un detector con el número de serie '${dto.serial_number}'`);
    }

    // Calcular vigencia legal a 2 años (ISO 17025) si no fue provista explícitamente
    let expiryDate = dto.calibration_expiry_date;
    if (!expiryDate) {
      const calDate = new Date(dto.calibration_date);
      calDate.setFullYear(calDate.getFullYear() + 2);
      expiryDate = calDate.toISOString().split('T')[0];
    }

    const { data: surveyMeter, error } = await supabase
      .from('radiation_survey_meters')
      .insert({
        model: dto.model,
        serial_number: dto.serial_number,
        manufacturer: dto.manufacturer,
        calibration_certificate: dto.calibration_certificate,
        calibration_date: dto.calibration_date,
        calibration_expiry_date: expiryDate,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error || !surveyMeter) {
      this.logger.error('Error al registrar detector de radiación:', error);
      throw new Error(`No se pudo registrar el detector: ${error?.message}`);
    }

    await this.audit.log({
      userId: requestingUserId,
      entityName: 'radiation_survey_meters',
      entityId: surveyMeter.id,
      action: 'CREATE',
      newValues: {
        model: surveyMeter.model,
        serial_number: surveyMeter.serial_number,
        certificate: surveyMeter.calibration_certificate,
        expiry_date: surveyMeter.calibration_expiry_date,
      },
    });

    return surveyMeter;
  }
}
