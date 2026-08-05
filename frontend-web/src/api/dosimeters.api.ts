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
  | 'INCIDENTE';

export interface DosimeterAssignment {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  notes: string | null;
  workers: {
    id: string;
    full_name: string;
    document_number: string | null;
    clients: { id: string; name: string; code: string | null };
  };
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
): Promise<{ items: DosimeterAssignment[] }> => {
  const { data } = await api.get<{ items: DosimeterAssignment[] }>(`/dosimeters/${id}/history`);
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
