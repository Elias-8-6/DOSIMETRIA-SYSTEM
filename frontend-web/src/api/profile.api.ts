import api from './axios.config';

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
  degree_title?: string;
  university?: string;
  location?: string;
  document_number?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateProfileResponse {
  id: string;
  full_name: string;
  email: string;
  status: string;
  degree_title: string | null;
  university: string | null;
  location: string | null;
  document_number: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

export const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> => {
  const { data } = await api.patch<UpdateProfileResponse>('/auth/profile', payload);
  return data;
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<{ message: string }> => {
  const { data } = await api.patch<{ message: string }>('/auth/password', payload);
  return data;
};
