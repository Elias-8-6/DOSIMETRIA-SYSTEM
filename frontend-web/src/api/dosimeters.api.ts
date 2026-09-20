import api from './axios.config';

export type DosimeterCondition = 'normal' | 'danado' | 'contaminado' | 'perdido';
export type DosimeterStatusCode =
  | 'DISPONIBLE'
  | 'ASIGNADO'
  | 'EN_LAB'
  | 'EN_LECTURA'
  | 'PROCESADO'
  | 'ENTREGADO'
  | 'BAJA'
  | 'INCIDENTE'
  | 'EN_TRANSITO';

export interface DosimeterAssignment {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  notes: string | null;
  assigned_by?: string | null;
  users?: { id: string; full_name: string; email: string } | null;
  workers: {
    id: string;
    full_name: string;
    document_number: string | null;
    clients: { id: string; name: string; code: string | null };
    client_locations?: { id: string; name: string } | null;
  };
}

export interface DosimeterReading {
  id: string;
  read_at: string;
  measured_dose: number;
  dose_unit: string;
  uncertainty: number | null;
  reading_status: 'valido' | 'sospechoso' | 'invalido' | 'fuera_rango' | string;
  hp10: number | null;
  hp007: number | null;
  background_dose: number | null;
  period_start: string | null;
  period_end: string | null;
  equipment: { id: string; name: string; model: string | null } | null;
  service_orders?: { id: string; order_number?: string } | null;
}

export interface ContaminationCheck {
  id: string;
  checked_at: string;
  result: 'libre' | 'contaminado_leve' | 'contaminado_grave' | string;
  measured_value: number | null;
  unit: string | null;
  observations: string | null;
  users?: { id: string; full_name: string; email: string } | null;
  equipment?: { id: string; name: string; model: string | null } | null;
}

export interface DosimeterHistoryResponse {
  items: DosimeterAssignment[];
  assignments: DosimeterAssignment[];
  readings: DosimeterReading[];
  contaminations: ContaminationCheck[];
}

export interface Dosimeter {
  id: string;
  serial_number: string;
  internal_code: string | null;
  lot_number: string | null;
  manufacture_date: string | null;
  commissioning_date: string | null;
  wear_period_days: number | null;
  max_dose_limit: number | null;
  last_annealing_date: string | null;
  current_condition: DosimeterCondition;
  reusable: boolean;
  notes: string | null;
  model: string | null;
  manufacturer: string | null;
  photo_url: string | null;
  created_at: string;
  dosimeter_types: { id: string; code: string; name: string; technology: string };
  dosimeter_statuses: { id: string; code: DosimeterStatusCode; name: string };
}

export interface DosimeterDetail extends Dosimeter {
  /** Solo la asignación abierta (returned_at IS NULL), si existe. */
  dosimeter_assignments: DosimeterAssignment[];
}

export interface CreateDosimeterPayload {
  serial_number: string;
  dosimeter_type_id: string;
  internal_code?: string;
  lot_number?: string;
  manufacture_date?: string;
  commissioning_date?: string;
  wear_period_days?: number;
  max_dose_limit?: number;
  last_annealing_date?: string;
  current_condition?: DosimeterCondition;
  reusable?: boolean;
  notes?: string;
  model?: string;
  manufacturer?: string;
  photo_url?: string;
}

export type UpdateDosimeterPayload = Partial<CreateDosimeterPayload>;

export interface AssignDosimeterPayload {
  worker_id: string;
  assigned_at: string;
  notes?: string;
}

export interface ReturnDosimeterPayload {
  returned_at: string;
  current_condition?: DosimeterCondition;
  notes?: string;
}

export const getDosimeters = async (params?: {
  search?: string;
  dosimeter_type_id?: string;
  status_code?: string;
  current_condition?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Dosimeter[]; total: number }> => {
  const { data } = await api.get<{ items: Dosimeter[]; total: number }>('/dosimeters', { params });
  return data;
};

export const getDosimeter = async (id: string): Promise<DosimeterDetail> => {
  const { data } = await api.get<DosimeterDetail>(`/dosimeters/${id}`);
  return data;
};

export const getDosimeterHistory = async (
  id: string,
): Promise<DosimeterHistoryResponse> => {
  const { data } = await api.get<DosimeterHistoryResponse>(`/dosimeters/${id}/history`);
  return data;
};

export const createDosimeter = async (payload: CreateDosimeterPayload): Promise<Dosimeter> => {
  const { data } = await api.post<Dosimeter>('/dosimeters', payload);
  return data;
};

export const updateDosimeter = async (
  id: string,
  payload: UpdateDosimeterPayload,
): Promise<Dosimeter> => {
  const { data } = await api.patch<Dosimeter>(`/dosimeters/${id}`, payload);
  return data;
};

export const updateDosimeterStatus = async (
  id: string,
  status: DosimeterStatusCode,
): Promise<{ id: string; serial_number: string; dosimeter_statuses: { code: string; name: string } }> => {
  const { data } = await api.patch(`/dosimeters/${id}/status`, { status });
  return data;
};

export interface AssignmentMutationResult {
  id: string;
  dosimeter_id: string;
  worker_id: string;
  assigned_at: string;
  returned_at?: string | null;
  status: string;
  notes: string | null;
}

export const assignDosimeter = async (
  id: string,
  payload: AssignDosimeterPayload,
): Promise<AssignmentMutationResult> => {
  const { data } = await api.post<AssignmentMutationResult>(`/dosimeters/${id}/assign`, payload);
  return data;
};

export const returnDosimeter = async (
  id: string,
  payload: ReturnDosimeterPayload,
): Promise<AssignmentMutationResult> => {
  const { data } = await api.post<AssignmentMutationResult>(`/dosimeters/${id}/return`, payload);
  return data;
};

export const uploadDosimeterPhoto = async (
  file: File,
  dosimeterId?: string,
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const endpoint = dosimeterId ? `/dosimeters/${dosimeterId}/photo` : '/dosimeters/upload-photo';
  const { data } = await api.post<{ url: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
