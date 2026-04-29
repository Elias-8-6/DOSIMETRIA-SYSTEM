import api from './axios.config';

export interface LoginCredentials {
  email:    string;
  password: string;
}

export interface LoginResponse {
  access_token:  string;
  refresh_token: string;
  user: {
    id:        string;
    full_name: string;
    email:     string;
    roles:     { code: string; name: string }[];
  };
}

export interface UserProfile {
  id:           string;
  full_name:    string;
  email:        string;
  status:       string;
  organization: string;
  // Migración 012
  degree_title:  string | null;
  university:    string | null;
  location:      string | null;
  // Migración 013
  document_number:   string | null;
  phone:             string | null;
  date_of_birth:     string | null;
  hire_date:         string | null;
  signature_url:     string | null;
  profile_photo_url: string | null;
  roles:        { code: string; name: string }[];
  permissions:  { code: string; module: string; action: string }[];
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
};

export const getProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get<UserProfile>('/auth/profile');
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};
