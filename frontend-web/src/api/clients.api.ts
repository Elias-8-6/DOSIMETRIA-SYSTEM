import api from './axios.config';

export type ClientType =
  | 'hospital'
  | 'clinica'
  | 'industria'
  | 'investigacion'
  | 'gobierno'
  | 'otro';

export type RadiationType = 'rayos_x' | 'gamma' | 'neutrones' | 'beta' | 'mixta' | 'otro';
export type RiskLevel = 'bajo' | 'medio' | 'alto';
export type ClientStatus = 'active' | 'inactive';

export interface ClientLocation {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  radiation_type: RadiationType | null;
  risk_level: RiskLevel | null;
  status: ClientStatus;
}

export interface Client {
  id: string;
  code: string | null;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  client_type: ClientType | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  status: ClientStatus;
  created_at: string;
  client_locations: ClientLocation[];
}

export interface CreateClientPayload {
  name: string;
  code?: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  website?: string;
  client_type?: ClientType;
  contract_start_date?: string;
  contract_end_date?: string;
}

export type UpdateClientPayload = Partial<Omit<CreateClientPayload, 'code'>>;

export interface CreateLocationPayload {
  name: string;
  address?: string;
  phone?: string;
  contact_name?: string;
  radiation_type?: RadiationType;
  risk_level?: RiskLevel;
}

// peticion a la api

export const getClients = async (params?: {
  search?: string;
  status?: string;
  client_type?: string;
}): Promise<Client[]> => {
  const { data } = await api.get<Client[]>('/clients', { params });
  return data;
};

export const getClient = async (id: string): Promise<Client> => {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
};

export const createClient = async (payload: CreateClientPayload): Promise<Client> => {
  const { data } = await api.post<Client>('/clients', payload);
  return data;
};

export const updateClient = async (id: string, payload: UpdateClientPayload): Promise<Client> => {
  const { data } = await api.patch<Client>(`/clients/${id}`, payload);
  return data;
};

export const updateClientStatus = async (
  id: string,
  status: ClientStatus,
): Promise<{ id: string; name: string; status: ClientStatus }> => {
  const { data } = await api.patch(`/clients/${id}/status`, { status });
  return data;
};

export const createClientLocation = async (
  clientId: string,
  payload: CreateLocationPayload,
): Promise<ClientLocation> => {
  const { data } = await api.post<ClientLocation>(`/clients/${clientId}/locations`, payload);
  return data;
};

export const updateClientLocation = async (
  clientId: string,
  locationId: string,
  payload: Partial<CreateLocationPayload>,
): Promise<ClientLocation> => {
  const { data } = await api.patch<ClientLocation>(
    `/clients/${clientId}/locations/${locationId}`,
    payload,
  );
  return data;
};

export const updateClientLocationStatus = async (
  clientId: string,
  locationId: string,
  status: ClientStatus,
): Promise<{ id: string; name: string; status: ClientStatus }> => {
  const { data } = await api.patch(`/clients/${clientId}/locations/${locationId}/status`, {
    status,
  });
  return data;
};
