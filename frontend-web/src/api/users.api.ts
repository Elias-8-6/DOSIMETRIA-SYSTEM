import api from './axios.config';

export interface User {
  id:              string;
  full_name:       string;
  email:           string;
  status:          string;
  created_at:      string;
  roles:           { code: string; name: string }[];
  // Migración 012
  degree_title?:   string | null;
  university?:     string | null;
  location?:       string | null;
  // Migración 013
  document_number?: string | null;
  phone?:           string | null;
  date_of_birth?:   string | null;
  hire_date?:       string | null;
}

export interface UserDetail extends User {
  permissions: {
    id:          string;
    code:        string;
    module:      string;
    action:      string;
    description: string;
  }[];
}

export interface Permission {
  id:          string;
  code:        string;
  module:      string;
  action:      string;
  description: string;
}

export interface CreateUserPayload {
  full_name:       string;
  email:           string;
  password:        string;
  role_code:       string;   // obligatorio
  // Migración 012
  degree_title?:   string;
  university?:     string;
  location?:       string;
  // Migración 013
  document_number?: string;
  phone?:           string;
  date_of_birth?:   string;
  hire_date?:       string;
}

export interface UpdateUserPayload {
  full_name?:      string;
  email?:          string;
  role_code?:      string;
  // Migración 012
  degree_title?:   string;
  university?:     string;
  location?:       string;
  // Migración 013
  document_number?: string;
  phone?:           string;
  date_of_birth?:   string;
  hire_date?:       string;
}

export const getUsers = async (params?: {
  search?: string;
  status?: string;
}): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users', { params });
  return data;
};

export const getUserById = async (id: string): Promise<UserDetail> => {
  const { data } = await api.get<UserDetail>(`/users/${id}`);
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const { data } = await api.post<User>('/users', payload);
  return data;
};

export const updateUser = async (
  id: string,
  payload: UpdateUserPayload,
): Promise<User> => {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
};

export const updateUserStatus = async (
  id: string,
  status: 'active' | 'inactive',
): Promise<{ id: string; status: string }> => {
  const { data } = await api.patch(`/users/${id}/status`, { status });
  return data;
};

export const getPermissions = async (): Promise<Permission[]> => {
  const { data } = await api.get<Permission[]>('/permissions');
  return data;
};

export const assignPermission = async (
  userId: string,
  permissionId: string,
): Promise<void> => {
  await api.post(`/users/${userId}/permissions`, { permission_id: permissionId });
};

export const revokePermission = async (
  userId: string,
  permissionId: string,
): Promise<void> => {
  await api.delete(`/users/${userId}/permissions/${permissionId}`);
};
