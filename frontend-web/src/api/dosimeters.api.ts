import api from './axios.config';

export type DosimeterCondition = 'normal' | 'danado' | 'contaminado' | 'perdido';
export type DosimeterStatusCode =
  | 'DISPONIBLE'
  | 'ASIGNADO'
  | 'EN_LAB'
  | 'EN_LECTURA'
  | 'PROCESADO'
  | 'ENTREGADO'
  | 'BAJA'
  | 'INCIDENTE'
  | 'EN_TRANSITO';

export interface DosimeterAssignment {
  id: string;
  assigned_at: string;
  returned_at: string | null;
  status: string;
  notes: string | null;
  assigned_by?: string | null;
  users?: { id: string; full_name: string; email: string } | null;
  workers: {
    id: string;
    full_name: string;
    document_number: string | null;
    clients: { id: string; name: string; code: string | null };
    client_locations?: { id: string; name: string } | null;
  };
}

export interface DosimeterReading {
  id: string;
  read_at: string;
  measured_dose: number;
  dose_unit: string;
  uncertainty: number | null;
  reading_status: 'valido' | 'sospechoso' | 'invalido' | 'fuera_rango' | string;
  hp10: number | null;
  hp007: number | null;
  background_dose: number | null;
  period_start: string | null;
  period_end: string | null;
  equipment: { id: string; name: string; model: string | null } | null;
  service_orders?: { id: string; order_number?: string } | null;
}

export interface ContaminationCheck {
  id: string;
  checked_at: string;
  result: 'libre' | 'contaminado_leve' | 'contaminado_grave' | string;
  measured_value: number | null;
  unit: string | null;
  observations: string | null;
  users?: { id: string; full_name: string; email: string } | null;
  equipment?: { id: string; name: string; model: string | null } | null;
}

export interface DosimeterHistoryResponse {
  items: DosimeterAssignment[];
  assignments: DosimeterAssignment[];
  readings: DosimeterReading[];
  contaminations: ContaminationCheck[];
}

export interface Dosimeter {
  id: string;
  serial_number: string;
  barcode: string;
  internal_code: string | null;
  lot_number: string | null;
  manufacture_date: string | null;
  commissioning_date: string | null;
  wear_period_days: number | null;
  max_dose_limit: number | null;
  last_annealing_date: string | null;
  current_condition: DosimeterCondition;
  reusable: boolean;
  notes: string | null;
  model: string | null;
  manufacturer: string | null;
  photo_url: string | null;
  created_at: string;
  dosimeter_types: { id: string; code: string; name: string; technology: string };
  dosimeter_statuses: { id: string; code: DosimeterStatusCode; name: string };
  active_holder?: (HolderDosimeter & {
    assembly_id?: string | null;
    assembled_at?: string | null;
  }) | null;
}

export interface DosimeterDetail extends Dosimeter {
  /** Solo la asignación abierta (returned_at IS NULL), si existe. */
  dosimeter_assignments: DosimeterAssignment[];
}

export interface CreateDosimeterPayload {
  serial_number: string;
  barcode?: string;
  auto_generate_barcode?: boolean;
  dosimeter_type_id: string;
  internal_code?: string;
  lot_number?: string;
  manufacture_date?: string;
  commissioning_date?: string;
  wear_period_days?: number;
  max_dose_limit?: number;
  last_annealing_date?: string;
  current_condition?: DosimeterCondition;
  reusable?: boolean;
  notes?: string;
  model?: string;
  manufacturer?: string;
  photo_url?: string;
}

export type UpdateDosimeterPayload = Partial<CreateDosimeterPayload>;

export interface AssignDosimeterPayload {
  worker_id: string;
  assigned_at: string;
  notes?: string;
  holder_id?: string;
  holder_barcode?: string;
}

export interface ReturnDosimeterPayload {
  returned_at: string;
  current_condition?: DosimeterCondition;
  notes?: string;
}

export interface ValidatedDosimeterInfo {
  id: string;
  serial_number: string;
  barcode: string;
  internal_code?: string | null;
  lot_number?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  current_condition: string;
  reusable: boolean;
  status_code?: string;
  status_name?: string;
  dosimeter_type_name?: string;
  active_holder?: {
    id: string;
    barcode: string;
    serial_number: string;
    holder_color?: string | null;
    clip_type?: string | null;
    model?: string | null;
    current_condition?: string;
    status: HolderStatus;
  } | null;
  active_assignment?: {
    id: string;
    assigned_at: string;
    worker_name?: string;
    client_name?: string;
  } | null;
}

export interface ValidateDosimeterBarcodeResponse {
  exists: boolean;
  dosimeter: ValidatedDosimeterInfo | null;
  message: string;
}

export const getDosimeters = async (params?: {
  search?: string;
  barcode?: string;
  dosimeter_type_id?: string;
  status_code?: string;
  current_condition?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Dosimeter[]; total: number }> => {
  const { data } = await api.get<{ items: Dosimeter[]; total: number }>('/dosimeters', { params });
  return data;
};

export const validateDosimeterBarcode = async (
  barcode: string,
): Promise<ValidateDosimeterBarcodeResponse> => {
  const cleanBarcode = encodeURIComponent(barcode.trim());
  const { data } = await api.get<ValidateDosimeterBarcodeResponse>(
    `/dosimeters/validate-barcode/${cleanBarcode}`,
  );
  return data;
};

export const getDosimeterByBarcode = async (barcode: string): Promise<DosimeterDetail> => {
  const cleanBarcode = encodeURIComponent(barcode.trim());
  const { data } = await api.get<DosimeterDetail>(`/dosimeters/barcode/${cleanBarcode}`);
  return data;
};

export const getDosimeter = async (id: string): Promise<DosimeterDetail> => {
  const { data } = await api.get<DosimeterDetail>(`/dosimeters/${id}`);
  return data;
};

export const getDosimeterById = getDosimeter;

export const getDosimeterHistory = async (
  id: string,
): Promise<DosimeterHistoryResponse> => {
  const { data } = await api.get<DosimeterHistoryResponse>(`/dosimeters/${id}/history`);
  return data;
};

export const createDosimeter = async (payload: CreateDosimeterPayload): Promise<Dosimeter> => {
  const { data } = await api.post<Dosimeter>('/dosimeters', payload);
  return data;
};

export const updateDosimeter = async (
  id: string,
  payload: UpdateDosimeterPayload,
): Promise<Dosimeter> => {
  const { data } = await api.patch<Dosimeter>(`/dosimeters/${id}`, payload);
  return data;
};

export const updateDosimeterStatus = async (
  id: string,
  status: DosimeterStatusCode,
): Promise<{ id: string; serial_number: string; dosimeter_statuses: { code: string; name: string } }> => {
  const { data } = await api.patch(`/dosimeters/${id}/status`, { status });
  return data;
};

export interface AssignmentMutationResult {
  id: string;
  dosimeter_id: string;
  worker_id: string;
  assigned_at: string;
  returned_at?: string | null;
  status: string;
  notes: string | null;
}

export const assignDosimeter = async (
  id: string,
  payload: AssignDosimeterPayload,
): Promise<AssignmentMutationResult> => {
  const { data } = await api.post<AssignmentMutationResult>(`/dosimeters/${id}/assign`, payload);
  return data;
};

export const returnDosimeter = async (
  id: string,
  payload: ReturnDosimeterPayload,
): Promise<AssignmentMutationResult> => {
  const { data } = await api.post<AssignmentMutationResult>(`/dosimeters/${id}/return`, payload);
  return data;
};

export const uploadDosimeterPhoto = async (
  file: File,
  dosimeterId?: string,
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const endpoint = dosimeterId ? `/dosimeters/${dosimeterId}/photo` : '/dosimeters/upload-photo';
  const { data } = await api.post<{ url: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// ==========================================
// Extensiones Minsa / ISO 17025 (Modelado Físico Portadosímetros)
// ==========================================

export interface HolderActiveAssembly {
  assembly_id: string;
  assembled_at: string;
  assembled_by?: { id: string; full_name: string; email: string } | null;
  tld_card?: {
    id: string;
    serial_number: string;
    elements_count: number;
    tld_material?: string;
    annealing_cycles_count?: number;
    status?: string;
  } | null;
  dosimeter?: {
    id: string;
    serial_number: string;
    current_condition?: string;
    model?: string;
  } | null;
}

export interface HolderAssemblyRecord {
  id: string;
  is_active: boolean;
  assembled_at: string;
  disassembled_at?: string | null;
  notes?: string | null;
  tld_cards?: {
    id: string;
    serial_number: string;
    elements_count?: number;
    tld_material?: string;
    status?: string;
  } | null;
  dosimeters?: {
    id: string;
    serial_number: string;
    current_condition?: string;
    model?: string;
  } | null;
}

export type HolderStatus =
  | 'disponible'
  | 'ensamblado'
  | 'en_campo'
  | 'en_triaje'
  | 'danado'
  | 'baja'
  | string;

export interface HolderDosimeter {
  id: string;
  barcode: string;
  serial_number: string;
  holder_color?: string | null;
  clip_type?: string | null;
  model?: string | null;
  storage_location?: string | null;
  current_condition: string;
  status: HolderStatus;
  notes?: string | null;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  active_assembly?: HolderActiveAssembly | null;
  assembly_history?: HolderAssemblyRecord[];
}

export interface HolderListResponse {
  items: HolderDosimeter[];
  total: number;
}

export interface CreateHolderPayload {
  barcode?: string;
  auto_generate_barcode?: boolean;
  serial_number?: string;
  model?: string;
  storage_location?: string;
  holder_color?: string;
  clip_type?: string;
  current_condition?: string;
  notes?: string;
}

export interface UpdateHolderPayload {
  barcode?: string;
  serial_number?: string;
  model?: string;
  storage_location?: string;
  holder_color?: string;
  clip_type?: string;
  current_condition?: string;
  status?: string;
  notes?: string;
}

export interface ValidateBarcodeResponse {
  exists: boolean;
  holder: HolderDosimeter | null;
  message: string;
}

export interface TldCard {
  id: string;
  serial_number: string;
  card_type?: string;
  elements_count?: number;
  pellet_count?: number;
  sensitivity_factor?: number;
  status: string;
  is_active?: boolean;
}

export const getHolders = async (params?: {
  barcode?: string;
  search?: string;
  status?: string;
  current_condition?: string;
  page?: number | string;
  limit?: number | string;
}): Promise<HolderListResponse> => {
  const { data } = await api.get('/dosimeters/holders', { params });
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return { items: data?.items || [], total: data?.total ?? 0 };
};

export const getHolderById = async (id: string): Promise<HolderDosimeter> => {
  const { data } = await api.get(`/dosimeters/holders/${id}`);
  return data;
};

export const findHolderByBarcode = async (barcode: string): Promise<HolderDosimeter> => {
  const { data } = await api.get(`/dosimeters/holders/barcode/${encodeURIComponent(barcode)}`);
  return data;
};

export const validateHolderBarcode = async (barcode: string): Promise<ValidateBarcodeResponse> => {
  const cleanBarcode = barcode.trim();
  try {
    const { data } = await api.get<ValidateBarcodeResponse>(
      `/dosimeters/holders/validate-barcode/${encodeURIComponent(cleanBarcode)}`,
    );
    return data;
  } catch (err: unknown) {
    // Fallback de resiliencia si el servidor backend aún no se ha reiniciado tras la compilación
    const errorObj = err as { response?: { status?: number; data?: unknown } };
    const status = errorObj?.response?.status;
    const isCannotGet =
      typeof errorObj?.response?.data === 'string' &&
      errorObj.response.data.includes('Cannot GET');

    if (status === 404 || isCannotGet) {
      try {
        const { data: existingHolder } = await api.get<HolderDosimeter>(
          `/dosimeters/holders/barcode/${encodeURIComponent(cleanBarcode)}`,
        );
        return {
          exists: true,
          holder: existingHolder,
          message: `El portadosímetro con código de barras '${cleanBarcode}' ya existe en el sistema.`,
        };
      } catch (fallbackErr: unknown) {
        const fallbackErrObj = fallbackErr as { response?: { status?: number } };
        if (fallbackErrObj?.response?.status === 404) {
          return {
            exists: false,
            holder: null,
            message: `El código de barras '${cleanBarcode}' está disponible para registro.`,
          };
        }
        // Si ambos fallan con otro error, consultar por query param list
        try {
          const listRes = await getHolders({ barcode: cleanBarcode, limit: 1 });
          const found = listRes.items.find((h) => h.barcode === cleanBarcode);
          if (found) {
            return {
              exists: true,
              holder: found,
              message: `El portadosímetro con código de barras '${cleanBarcode}' ya existe en el sistema.`,
            };
          }
          return {
            exists: false,
            holder: null,
            message: `El código de barras '${cleanBarcode}' está disponible para registro.`,
          };
        } catch {
          // Si no se puede verificar, rethrow del error original
          throw err;
        }
      }
    }
    throw err;
  }
};

export const createHolder = async (payload: CreateHolderPayload): Promise<HolderDosimeter> => {
  const { data } = await api.post<HolderDosimeter>('/dosimeters/holders', payload);
  return data;
};

export const updateHolder = async (
  id: string,
  payload: UpdateHolderPayload,
): Promise<HolderDosimeter> => {
  const { data } = await api.patch<HolderDosimeter>(`/dosimeters/holders/${id}`, payload);
  return data;
};

export const deleteHolder = async (
  id: string,
): Promise<{ message: string; holder: HolderDosimeter }> => {
  const { data } = await api.delete<{ message: string; holder: HolderDosimeter }>(
    `/dosimeters/holders/${id}`,
  );
  return data;
};

export const getTldCards = async (params?: { serial_number?: string; status?: string }): Promise<TldCard[]> => {
  const { data } = await api.get('/dosimeters/tld-cards', { params });
  return Array.isArray(data) ? data : data?.items || [];
};

export const assembleDosimeter = async (payload: {
  holder_id: string;
  tld_card_id?: string;
  dosimeter_id?: string;
  notes?: string;
}) => {
  const { data } = await api.post('/dosimeters/assemble', payload);
  return data;
};

export const disassembleDosimeter = async (payload: {
  assembly_id: string;
  reason?: string;
}) => {
  const { data } = await api.post('/dosimeters/disassemble', payload);
  return data;
};
