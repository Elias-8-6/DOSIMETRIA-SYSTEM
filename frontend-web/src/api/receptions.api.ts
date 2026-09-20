import api from './axios.config';

export type PackagingCondition = 'integro' | 'danado_leve' | 'danado_grave';

export type ReceptionItemCondition =
  | 'normal'
  | 'danado_fisico'
  | 'sello_roto'
  | 'contaminado'
  | 'perdido';

export interface ReceptionDosimeter {
  id: string;
  serial_number: string;
  internal_code: string | null;
  model?: string | null;
  manufacturer?: string | null;
  photo_url?: string | null;
  dosimeter_types?: {
    id: string;
    code?: string;
    name: string;
    technology: string;
  } | null;
}

export interface ReceptionIncidentReport {
  id: string;
  dosimeter_id?: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string;
  reported_at: string;
}

export interface ReceptionItem {
  id: string;
  dosimeter_id: string;
  received_condition: ReceptionItemCondition;
  sealed: boolean;
  contaminated: boolean;
  observations: string | null;
  condition_photo_url: string | null;
  dosimeters: ReceptionDosimeter;
  incident_reports?: ReceptionIncidentReport[];
}

export interface Reception {
  id: string;
  reception_code: string;
  service_order_id: string;
  received_at: string;
  packaging_condition: PackagingCondition;
  observations: string | null;
  items_count: number;
  users?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  service_orders: {
    id: string;
    order_number: string;
    status: string;
    clients: {
      id: string;
      code: string | null;
      name: string;
    };
  };
}

export interface ReceptionDetail extends Reception {
  reception_items: ReceptionItem[];
}

export interface PendingOrderDosimeterItem {
  id: string;
  dosimeter_id: string;
  requested_action: string;
  status: string;
  dosimeters: ReceptionDosimeter;
}

export interface PendingOrderForReception {
  id: string;
  order_number: string;
  service_type: string;
  status: string;
  priority: string;
  requested_date: string | null;
  due_date: string | null;
  clients: {
    id: string;
    code: string | null;
    name: string;
  };
  service_order_items: PendingOrderDosimeterItem[];
}

export interface CreateReceptionItemPayload {
  dosimeter_id: string;
  received_condition: ReceptionItemCondition;
  sealed?: boolean;
  contaminated?: boolean;
  observations?: string;
  condition_photo_url?: string;
}

export interface CreateReceptionPayload {
  service_order_id: string;
  packaging_condition: PackagingCondition;
  observations?: string;
  items: CreateReceptionItemPayload[];
}

export interface UpdateReceptionPayload {
  packaging_condition?: PackagingCondition;
  observations?: string;
}

export interface QueryReceptionsParams {
  search?: string;
  packaging_condition?: PackagingCondition;
  service_order_id?: string;
  client_id?: string;
  page?: number;
  limit?: number;
}

export interface ReceptionsListResponse {
  items: Reception[];
  total: number;
}

export const getReceptions = async (
  params?: QueryReceptionsParams,
): Promise<ReceptionsListResponse> => {
  const { data } = await api.get<ReceptionsListResponse>('/receptions', { params });
  return data;
};

export const getReceptionById = async (id: string): Promise<ReceptionDetail> => {
  const { data } = await api.get<ReceptionDetail>(`/receptions/${id}`);
  return data;
};

export const getPendingOrdersForReception = async (
  search?: string,
): Promise<PendingOrderForReception[]> => {
  const { data } = await api.get<PendingOrderForReception[]>('/receptions/pending-orders', {
    params: { search },
  });
  return data;
};

export const createReception = async (
  payload: CreateReceptionPayload,
): Promise<ReceptionDetail> => {
  const { data } = await api.post<ReceptionDetail>('/receptions', payload);
  return data;
};

export const updateReception = async (
  id: string,
  payload: UpdateReceptionPayload,
): Promise<Reception> => {
  const { data } = await api.patch<Reception>(`/receptions/${id}`, payload);
  return data;
};

export const uploadReceptionPhoto = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{ url: string }>('/receptions/upload-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};
