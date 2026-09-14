import api from './axios.config';

export type ServiceType = 'lectura_dosis' | 'lectura_y_recarga' | 'mantenimiento' | 'calibracion';
export type ServiceOrderStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'IN_PROCESS'
  | 'QC_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';
export type Priority = 'normal' | 'urgente' | 'critica';
export type RequestedAction = 'lectura' | 'limpieza' | 'recarga' | 'inspeccion';

export interface ServiceOrder {
  id: string;
  order_number: string;
  service_type: ServiceType;
  status: ServiceOrderStatus;
  priority: Priority;
  requested_date: string | null;
  due_date: string | null;
  created_at: string;
  clients: { id: string; code: string | null; name: string };
  items_count: number;
}

export interface ServiceOrderItem {
  id: string;
  requested_action: RequestedAction;
  status: string;
  dosimeters: { id: string; serial_number: string; internal_code: string | null };
}

export interface ServiceOrderDetail {
  id: string;
  order_number: string;
  service_type: ServiceType;
  status: ServiceOrderStatus;
  priority: Priority;
  requested_date: string | null;
  due_date: string | null;
  observations: string | null;
  created_at: string;
  created_by: string | null;
  clients: {
    id: string;
    code: string | null;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
  service_order_items: ServiceOrderItem[];
}

export interface CreateServiceOrderItemPayload {
  dosimeter_id: string;
  requested_action: RequestedAction;
}

export interface CreateServiceOrderPayload {
  client_id: string;
  service_type: ServiceType;
  requested_date?: string;
  due_date?: string;
  observations?: string;
  priority?: Priority;
  items: CreateServiceOrderItemPayload[];
}

export interface UpdateServiceOrderPayload {
  due_date?: string;
  observations?: string;
  priority?: Priority;
}

export const getServiceOrders = async (params?: {
  search?: string;
  status?: string;
  service_type?: string;
  priority?: string;
  client_id?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ServiceOrder[]; total: number }> => {
  const { data } = await api.get<{ items: ServiceOrder[]; total: number }>('/service-orders', {
    params,
  });
  return data;
};

export const getServiceOrder = async (id: string): Promise<ServiceOrderDetail> => {
  const { data } = await api.get<ServiceOrderDetail>(`/service-orders/${id}`);
  return data;
};

export const createServiceOrder = async (
  payload: CreateServiceOrderPayload,
): Promise<ServiceOrderDetail> => {
  const { data } = await api.post<ServiceOrderDetail>('/service-orders', payload);
  return data;
};

export const updateServiceOrder = async (
  id: string,
  payload: UpdateServiceOrderPayload,
): Promise<{ id: string; order_number: string; due_date: string | null; observations: string | null; priority: Priority }> => {
  const { data } = await api.patch(`/service-orders/${id}`, payload);
  return data;
};

export const updateServiceOrderStatus = async (
  id: string,
  status: Exclude<ServiceOrderStatus, 'CANCELLED'>,
): Promise<{ id: string; order_number: string; status: ServiceOrderStatus }> => {
  const { data } = await api.patch(`/service-orders/${id}/status`, { status });
  return data;
};

export const cancelServiceOrder = async (
  id: string,
): Promise<{ id: string; order_number: string; status: ServiceOrderStatus }> => {
  const { data } = await api.post(`/service-orders/${id}/cancel`);
  return data;
};

export const addServiceOrderItem = async (
  id: string,
  payload: CreateServiceOrderItemPayload,
): Promise<ServiceOrderItem> => {
  const { data } = await api.post<ServiceOrderItem>(`/service-orders/${id}/items`, payload);
  return data;
};

export const removeServiceOrderItem = async (
  id: string,
  itemId: string,
): Promise<{ id: string; removed: boolean }> => {
  const { data } = await api.delete(`/service-orders/${id}/items/${itemId}`);
  return data;
};
