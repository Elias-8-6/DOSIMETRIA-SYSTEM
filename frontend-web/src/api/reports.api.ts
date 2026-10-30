import api from './axios.config';

export interface ExcessiveDoseAlert {
  reading_id: string;
  read_at: string;
  measured_dose: number;
  hp10: number | null;
  hp007: number | null;
  background_dose: number | null;
  reading_status: string;
  period_start: string | null;
  period_end: string | null;
  dosimeter_id: string;
  dosimeter_serial: string;
  worker_id: string | null;
  worker_document_number: string | null;
  worker_full_name: string | null;
  worker_occupation: string | null;
  worker_medical_status: string | null;
  client_id: string | null;
  client_name: string | null;
  client_code: string | null;
  client_address: string | null;
  client_contact_name: string | null;
  incident_report_id: string | null;
  incident_status: string | null;
  incident_severity: string | null;
  incident_description: string | null;
  equipment_name: string | null;
}

export interface OfficialReportSummary {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id: string | null;
  report_number: string;
  report_type: 'MENSUAL_CLIENTE' | 'CONSOLIDADO_ANUAL' | 'HISTORIAL_POE' | 'URGENTE_DOSIS_EXCESIVA';
  period_year: number;
  period_month: number | null;
  issued_at: string;
  issued_by: string;
  integrity_hash: string;
  status: 'EMITIDO' | 'ANULADO';
  clients?: {
    name: string;
    code: string | null;
  };
}

export interface WorkerHistoryResponse {
  message: string;
  integrity_hash: string;
  data: {
    record_type: string;
    retention_legal_period: string;
    worker_profile: {
      id: string;
      document_number: string;
      full_name: string;
      date_of_birth: string | null;
      gender: string | null;
      occupation: string | null;
      start_date: string | null;
      medical_status: string;
      minsa_exam_date: string | null;
      minsa_exam_expiry_date: string | null;
      minsa_certificate_code: string | null;
    };
    employer: {
      client_id: string;
      name: string;
      code: string;
      address: string | null;
    };
    lifetime_summary: {
      total_evaluations_count: number;
      lifetime_total_hp10_mSv: number;
      lifetime_total_hp007_mSv: number;
      critical_alerts_total_count: number;
      annual_dose_limit_reference_mSv: number;
      five_year_cumulative_limit_reference_mSv: number;
    };
    yearly_breakdown: Array<{
      year: number;
      readings_count: number;
      total_hp10_mSv: number;
      total_hp007_mSv: number;
      critical_alerts_count: number;
      limit_consumed_percentage: number;
    }>;
    detailed_readings_chronology: Array<{
      reading_id: string;
      dosimeter_id: string;
      read_at: string;
      hp10_mSv: number;
      hp007_mSv: number;
      background_dose_mSv: number;
      status: string;
      is_alert_excessive_dose: boolean;
    }>;
    generated_at: string;
  };
}

export const reportsApi = {
  getExcessiveDoseAlerts: async (params?: {
    client_id?: string;
    worker_id?: string;
    incident_status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{ total: number; threshold_mSv: number; alerts: ExcessiveDoseAlert[] }> => {
    const response = await api.get('/reports/alerts/excessive-dose', { params });
    return response.data;
  },

  generateMonthlyReport: async (payload: {
    client_id: string;
    service_order_id?: string;
    period_year: number;
    period_month: number;
    dosimetry_notes?: string;
  }) => {
    const response = await api.post('/reports/monthly', payload);
    return response.data;
  },

  getWorkerHistory: async (
    workerId: string,
    params?: { from_year?: number; to_year?: number },
  ): Promise<WorkerHistoryResponse> => {
    const response = await api.get(`/reports/worker/${workerId}/history`, { params });
    return response.data;
  },

  generateUrgentExcessiveDoseReport: async (payload: {
    reading_id: string;
    incident_report_id?: string;
    investigation_summary: string;
    corrective_actions?: string;
    opr_conclusion?: string;
  }) => {
    const response = await api.post('/reports/urgent-excessive-dose', payload);
    return response.data;
  },

  getOfficialReports: async (params?: {
    client_id?: string;
    report_type?: string;
    year?: number;
    month?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; limit: number; offset: number; data: OfficialReportSummary[] }> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  getReportById: async (id: string) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
};
