import api from './axios.config';

export interface User {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  roles: { code: string; name: string }[];
}

export interface UserDetail extends User {
  permissions: { id: string; code: string; module: string; action: string; description: string }[];
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string;
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role_code?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
}

/**
 * GET /users?search=&status=
 */
export const getUsers = async (params?: { search?: string; status?: string }): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users', { params });
  return data;
};

/**
 * GET /users/:id
 */
export const getUserById = async (id: string): Promise<UserDetail> => {
  const { data } = await api.get<UserDetail>(`/users/${id}`);
  return data;
};

/**
 * POST /users
 */
export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const { data } = await api.post<User>('/users', payload);
  return data;
};

/**
 * PATCH /users/:id
 */
export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<User> => {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
};

/**
 * PATCH /users/:id/status
 */
export const updateUserStatus = async (
  id: string,
  status: 'active' | 'inactive',
): Promise<{ id: string; status: string }> => {
  const { data } = await api.patch(`/users/${id}/status`, { status });
  return data;
};

/**
 * GET /permissions — catálogo completo
 */
export const getPermissions = async (): Promise<Permission[]> => {
  const { data } = await api.get<Permission[]>('/permissions');
  return data;
};

/**
 * POST /users/:id/permissions
 */
export const assignPermission = async (userId: string, permissionId: string): Promise<void> => {
  await api.post(`/users/${userId}/permissions`, { permission_id: permissionId });
};

/**
 * DELETE /users/:id/permissions/:permissionId
 */
export const revokePermission = async (userId: string, permissionId: string): Promise<void> => {
  await api.delete(`/users/${userId}/permissions/${permissionId}`);
};
