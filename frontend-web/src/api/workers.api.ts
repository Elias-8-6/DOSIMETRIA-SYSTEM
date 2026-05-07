import api from './axios.config';
export type WorkerStatus = 'active' | 'inactive';
export type WorkerGender = 'masculino' | 'femenino' | 'otro';

export interface WorkerAssignment {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  notes: string | null;
  dosimeters: {
    id: string;
    serial_number: string;
    internal_code: string | null;
    dosimeter_types: { name: string; technology: string };
    dosimeter_statuses: { code: string; name: string };
  };
}

export interface Worker {
  id: string;
  employee_code: string | null;
  full_name: string;
  document_number: string | null;
  date_of_birth: string | null;
  gender: WorkerGender | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  start_date: string | null;
  status: WorkerStatus;
  clients: { id: string; name: string; code: string | null };
  client_locations: { id: string; name: string } | null;
}

export interface WorkerDetail extends Worker {
  dosimeter_assignments: WorkerAssignment[];
}

export interface CreateWorkerPayload {
  client_id: string;
  client_location_id?: string;
  employee_code?: string;
  full_name: string;
  document_number?: string;
  date_of_birth?: string;
  gender?: WorkerGender;
  phone?: string;
  email?: string;
  occupation?: string;
  start_date?: string;
}
export const getWorkers = async (params?: {
  search?: string;
  status?: string;
  client_id?: string;
  client_location_id?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Worker[]; total: number }> => {
  const { data } = await api.get<{ items: Worker[]; total: number }>('/workers', { params });
  return data;
};

export const getWorker = async (id: string): Promise<WorkerDetail> => {
  const { data } = await api.get<WorkerDetail>(`/workers/${id}`);
  return data;
};

export const createWorker = async (payload: CreateWorkerPayload): Promise<Worker> => {
  console.log(payload);

  const { data } = await api.post<Worker>('/workers', payload);
  return data;
};

export const updateWorker = async (id: string, payload: UpdateWorkerPayload): Promise<Worker> => {
  const { data } = await api.patch<Worker>(`/workers/${id}`, payload);
  return data;
};

export const updateWorkerStatus = async (
  id: string,
  status: WorkerStatus,
): Promise<{ id: string; name: string; status: WorkerStatus }> => {
  const { data } = await api.patch(`/workers/${id}/status`, { status });
  return data;
};

export type UpdateWorkerPayload = Partial<Omit<CreateWorkerPayload, 'client_id'>>;
