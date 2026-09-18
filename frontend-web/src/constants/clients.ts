import type { ClientType } from '../api/clients.api';

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  hospital: 'Hospital',
  clinica: 'Clínica',
  industria: 'Industria',
  investigacion: 'Investigación',
  gobierno: 'Gobierno',
  otro: 'Otro',
};
