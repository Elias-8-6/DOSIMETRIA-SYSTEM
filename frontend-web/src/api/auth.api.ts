import api from './axios.config';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    roles: { code: string; name: string }[];
  };
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  status: string;
  organization: string;
  roles: { code: string; name: string }[];
  permissions: { code: string; module: string; action: string }[];
}

/**
 * Llama a POST /auth/login
 * Retorna los tokens y datos básicos del usuario.
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
};

/**
 * Llama a GET /auth/profile
 * Retorna el perfil completo con roles y permisos activos.
 */
export const getProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get<UserProfile>('/auth/profile');
  return data;
};

/**
 * Llama a POST /auth/logout
 * Revoca el refresh token en el backend.
 */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};
