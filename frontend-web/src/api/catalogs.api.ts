import api from './axios.config';

export interface DosimeterType {
  id: string;
  code: string;
  name: string;
  technology: string;
}

export interface DosimeterStatus {
  id: string;
  code: string;
  name: string;
}

export const getDosimeterTypes = async (): Promise<DosimeterType[]> => {
  const { data } = await api.get<DosimeterType[]>('/catalogs/dosimeter-types');
  return data;
};

export const getDosimeterStatuses = async (): Promise<DosimeterStatus[]> => {
  const { data } = await api.get<DosimeterStatus[]>('/catalogs/dosimeter-statuses');
  return data;
};
