import type { ServiceOrderDetail } from '../../../api/serviceOrders.api';
import { CasaDelMedicoLogo } from './CasaDelMedicoLogo';

interface Props {
  order: ServiceOrderDetail;
  catalogCode?: string;
  catalogDescription?: string;
  brandName?: string;
  legalSignee?: string;
  legalId?: string;
  legalRole?: string;
}

export function DeliveryNoteDocument({
  order,
  catalogCode = 'TLD-XBGN',
  catalogDescription = 'DOSIMETRO DE CUERPO ENTERO',
  brandName = 'Radetco',
  legalSignee = 'Guillermo Ungo',
  legalId = 'E-8-49486',
  legalRole = 'Apoderado Legal',
}: Props) {
  const items = order.service_order_items || [];
  const client = order.clients;

  // Format date in Spanish: "Panamá, 01 de febrero del 2026"
  const rawDate = order.requested_date || order.created_at;
  const dateObj = new Date(rawDate);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const month = monthNames[dateObj.getMonth()] || 'febrero';
  const year = dateObj.getFullYear() || 2026;
  const formattedDate = `Panamá, ${day} de ${month} del ${year}`;

  return (
    <div className="bg-white text-black p-10 max-w-[850px] mx-auto border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-sm font-sans flex flex-col justify-between min-h-[950px]">
      <div>
        {/* Encabezado */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <CasaDelMedicoLogo className="w-16 h-16 text-blue-900" />
            <h1 className="text-base font-extrabold tracking-wider uppercase text-gray-900 ml-2">
              HORACIO ICAZA Y CÍA., S.A.
            </h1>
          </div>

          <div className="text-right text-[11px] text-gray-700 leading-tight space-y-0.5">
            <p>Ave. Justo Arosemena y Calle 44E</p>
            <p>Bella Vista, Ciudad de Panamá</p>
            <p>Apartado postal: 0816-01076</p>
            <p className="font-medium">R.U.C. 477-46-104385-DV42</p>
            <p>Teléfono: 207-6300</p>
            <p className="pt-2 font-medium text-gray-900">{formattedDate}</p>
          </div>
        </div>

        {/* Destinatario */}
        <div className="mt-8 text-xs text-gray-900 space-y-0.5 leading-relaxed">
          <p>Estimado</p>
          <p className="font-bold">{client?.contact_name || 'Dr. Alexander Esquivel'}</p>
          <p className="font-semibold">{client?.name || 'Universidad Tecnológica de Panamá'}</p>
          {client?.address && <p className="text-gray-700">{client.address}</p>}
          <p className="font-bold tracking-wider pt-0.5">E.S.D.</p>
        </div>

        {/* Referencia y Saludo */}
        <div className="mt-6 text-xs text-gray-900 space-y-3">
          <p className="font-bold">
            Referencia: <span className="font-normal underline">Nota de Entrega de Mercancía</span>
          </p>
          <p>Estimados Señores:</p>
          <p>
            Por este medio informamos que procedemos hacer entrega, la mercancía detallados a continuación:
          </p>
        </div>

        {/* Tabla de Mercancía */}
        <div className="mt-4 border border-gray-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-800 font-bold text-center">
                <th className="border-r border-gray-800 py-1.5 px-3 w-28">Catálogo</th>
                <th className="border-r border-gray-800 py-1.5 px-3 text-left">Descripción</th>
                <th className="border-r border-gray-800 py-1.5 px-3 w-24">Cantidad</th>
                <th className="py-1.5 px-3 w-28">Cuenta</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300 text-center font-medium">
                <td className="border-r border-gray-800 py-2 px-3 font-mono text-[11px]">
                  {catalogCode}
                </td>
                <td className="border-r border-gray-800 py-2 px-3 text-left font-bold text-gray-800">
                  {catalogDescription}
                </td>
                <td className="border-r border-gray-800 py-2 px-3 font-bold text-blue-900 text-sm">
                  {items.length}
                </td>
                <td className="py-2 px-3 font-mono">
                  {client?.code || '153825'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Marca y Aclaración */}
        <div className="mt-4 text-xs text-gray-900 space-y-2">
          <p>
            <span className="font-bold">Marca: </span>
            <span>{brandName}</span>
          </p>
          <p className="pt-2">Sin más que agregar.</p>
        </div>

        {/* Firma del Emisor y Recibido */}
        <div className="mt-12 flex justify-between items-start">
          {/* Firma Empresa */}
          <div className="text-xs space-y-1">
            <p>Atentamente,</p>
            <p className="font-bold pt-1">Horacio Icaza y CIA, S.A.</p>
            <div className="pt-10 border-b border-gray-600 w-48"></div>
            <p className="font-bold text-gray-900 pt-1">{legalSignee}</p>
            <p className="text-gray-700">Cédula. {legalId}</p>
            <p className="text-gray-700">{legalRole}</p>
          </div>

          {/* Recuadro de Recibido en destino */}
          <div className="border border-dashed border-gray-400 p-4 rounded bg-gray-50/50 w-64 text-xs space-y-2">
            <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] text-center border-b border-gray-200 pb-1">
              Acuse de Recibo
            </p>
            <div className="pt-6 border-b border-gray-400"></div>
            <p className="text-[11px] text-gray-600 text-center">Firma / Nombre de Quien Recibe</p>
            <div className="flex justify-between text-[10px] text-gray-600 pt-2">
              <span>Hora: _________</span>
              <span>Fecha: ___/___/2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie de página institucional */}
      <div className="mt-12 pt-3 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center font-bold text-[8px] text-gray-600">
            SGS
          </div>
          <span>Sistema de Gestión de Calidad Certificado ISO 17025</span>
        </div>
        <div className="text-right">
          <span>@lacasadelmedico · www.lacasadelmedico.com</span>
        </div>
      </div>
    </div>
  );
}
