import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@config/supabase.config';
import * as crypto from 'crypto';

@Injectable()
export class GetReportByIdUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(reportId: string, organizationId: string) {
    const client = this.supabase.getClient();

    const { data: report, error } = await client
      .from('official_reports')
      .select('*, clients(id, name, code, address, contact_name, contact_email)')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !report) {
      throw new NotFoundException(`Informe con ID ${reportId} no encontrado.`);
    }

    // Verificar integridad criptográfica SHA-256
    const canonicalString = JSON.stringify(report.content_data, Object.keys(report.content_data).sort());
    const computedHash = crypto.createHash('sha256').update(canonicalString).digest('hex');
    const isAuthentic = computedHash === report.integrity_hash;

    return {
      report,
      cryptographic_verification: {
        is_authentic: isAuthentic,
        stored_hash: report.integrity_hash,
        computed_hash: computedHash,
        algorithm: 'SHA-256',
        iso17025_status: isAuthentic ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_VIOLATION_TAMPERED',
      },
    };
  }
}
