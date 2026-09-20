import type { ServiceOrderDetail } from '../../../api/serviceOrders.api';
import { CasaDelMedicoLogo } from './CasaDelMedicoLogo';
import { formatDate } from '../../../utils/date';

interface Props {
  order: ServiceOrderDetail;
  companySignee?: string;
  periodLabel?: string;
  lotNumber?: string;
}

export function Repdos01Document({
  order,
  companySignee = 'Ruben Samudio',
  periodLabel = 'Actual',
  lotNumber = 'LOT-2026',
}: Props) {
  const items = order.service_order_items || [];
  const client = order.clients;
  const orderDate = order.requested_date ? formatDate(order.requested_date) : formatDate(order.created_at);

  return (
    <div className="bg-white text-black p-8 max-w-[850px] mx-auto border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs font-sans">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-400">
        <CasaDelMedicoLogo className="w-12 h-12 text-blue-900" />

        <div className="flex-1 text-center px-4">
          <div className="border border-gray-800 py-1.5 px-3 bg-gray-50/50">
            <h1 className="text-sm font-bold tracking-wider uppercase text-gray-900">
              HORACIO ICAZA Y CIA., S. A.
            </h1>
            <h2 className="text-xs font-semibold text-gray-800 tracking-wide mt-0.5">
              FORMULARIO DE ENTREGA Y RECIBO DE DOSIMETROS (CLIENTES) REPDOS-01
            </h2>
          </div>
        </div>

        <CasaDelMedicoLogo className="w-12 h-12 text-blue-900" />
      </div>

      {/* Metadatos */}
      <div className="mt-3 space-y-1.5 text-xs text-gray-900">
        <div className="flex justify-between items-baseline">
          <div>
            <span className="font-bold">Nombre de la Institución: </span>
            <span className="font-medium">{client?.name || 'Cliente sin asignar'}</span>
            <span className="ml-2 font-bold">No: </span>
            <span>{client?.code || '153825'}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <div>
            <span className="font-bold">Fecha: </span>
            <span>{orderDate}</span>
          </div>
          <div>
            <span className="font-bold">Persona de Contacto: </span>
            <span>{client?.contact_name || 'Personal Autorizado'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-700 italic pt-1">
          Marque con un gancho (✓) los dosímetros entregados y devueltos para cada periodo.
          Marque con un gancho (✓) el Buen Estado para cada dosímetro. Sino anotar en observaciones.
        </p>
      </div>

      {/* Tabla Principal */}
      <div className="mt-3 border border-gray-800 overflow-hidden">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-100 text-center font-bold">
              <th colSpan={4} className="border-r border-gray-800 py-1 px-2 text-left">
                DATOS
              </th>
              <th colSpan={3} className="border-r border-gray-800 py-1 px-1">
                <div className="text-[10px] uppercase">Periodo: {periodLabel} | Nº Lote: {lotNumber}</div>
                <div className="text-[11px]">Dosímetros entregados</div>
              </th>
              <th colSpan={3} className="py-1 px-1">
                <div className="text-[10px] uppercase">Periodo: {periodLabel} | Nº Lote: {lotNumber}</div>
                <div className="text-[11px]">Dosímetros devueltos</div>
              </th>
            </tr>
            <tr className="border-b border-gray-800 bg-gray-50 text-center font-semibold text-[10px]">
              <th className="border-r border-gray-800 py-1 px-1 w-20 text-left">PIN</th>
              <th className="border-r border-gray-800 py-1 px-1.5 text-left">Usuario</th>
              <th className="border-r border-gray-800 py-1 px-1 w-24 text-left">ID</th>
              <th className="border-r border-gray-800 py-1 px-1 w-24 text-left">Tipo D.</th>

              {/* Entregados */}
              <th className="border-r border-gray-400 py-1 px-1 w-14">Entregado (✓)</th>
              <th className="border-r border-gray-400 py-1 px-0.5 w-8">Sí</th>
              <th className="border-r border-gray-800 py-1 px-0.5 w-8">No</th>

              {/* Devueltos */}
              <th className="border-r border-gray-400 py-1 px-1 w-14">Devuelto (✓)</th>
              <th className="border-r border-gray-400 py-1 px-0.5 w-8">Sí</th>
              <th className="py-1 px-0.5 w-8">No</th>
            </tr>
          </thead>
          <tbody>
            {/* Cabecera de grupo institucional */}
            <tr className="bg-gray-100/70 border-b border-gray-400 font-bold">
              <td colSpan={10} className="py-1 px-2 text-center text-gray-800 uppercase tracking-wider text-[11px]">
                {client?.name || 'Alexander Esquivel UTP'}
              </td>
            </tr>

            {items.map((item) => {
              const workerName = item.dosimeters?.assigned_worker?.full_name || 'Control / Asignado en sede';
              const workerId = item.dosimeters?.assigned_worker?.document_number || '-';
              const typeDesc =
                item.dosimeters?.dosimeter_types?.code ||
                item.dosimeters?.model ||
                '82-Standard-CH';

              return (
                <tr key={item.id} className="border-b border-gray-300 hover:bg-gray-50/50">
                  <td className="border-r border-gray-800 py-1 px-1.5 font-mono text-[10px] text-gray-900">
                    {item.dosimeters?.serial_number}
                  </td>
                  <td className="border-r border-gray-800 py-1 px-1.5 font-medium text-gray-900 truncate max-w-[170px]">
                    {workerName}
                  </td>
                  <td className="border-r border-gray-800 py-1 px-1.5 text-gray-700">
                    {workerId}
                  </td>
                  <td className="border-r border-gray-800 py-1 px-1.5 text-gray-800 text-[10px]">
                    {typeDesc}
                  </td>

                  {/* Entregados checks */}
                  <td className="border-r border-gray-400 py-1 text-center font-bold text-blue-700">
                    ✓
                  </td>
                  <td className="border-r border-gray-400 py-1 text-center">
                    <span className="inline-block w-3 h-3 border border-gray-400"></span>
                  </td>
                  <td className="border-r border-gray-800 py-1 text-center">
                    <span className="inline-block w-3 h-3 border border-gray-400"></span>
                  </td>

                  {/* Devueltos checks */}
                  <td className="border-r border-gray-400 py-1 text-center font-bold text-blue-700">
                    ✓
                  </td>
                  <td className="border-r border-gray-400 py-1 text-center">
                    <span className="inline-block w-3 h-3 border border-gray-400"></span>
                  </td>
                  <td className="py-1 text-center">
                    <span className="inline-block w-3 h-3 border border-gray-400"></span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sección: Dosímetros devueltos retrasados */}
      <div className="mt-4">
        <h3 className="text-xs font-bold text-gray-900 mb-1">Dosímetros devueltos retrasados</h3>
        <table className="w-full text-left border border-gray-800 border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-800 font-bold text-center">
              <th className="border-r border-gray-800 py-1 px-2 w-24 text-left">Pin</th>
              <th className="border-r border-gray-800 py-1 px-2 text-left">Usuario</th>
              <th className="border-r border-gray-800 py-1 px-2 text-left">Periodo de uso</th>
              <th colSpan={2} className="py-1 px-2 w-28">Buen Estado (✓)</th>
            </tr>
            <tr className="border-b border-gray-800 bg-gray-50 text-center font-medium">
              <th className="border-r border-gray-800"></th>
              <th className="border-r border-gray-800"></th>
              <th className="border-r border-gray-800"></th>
              <th className="border-r border-gray-800 py-0.5 w-14">Sí</th>
              <th className="py-0.5 w-14">No</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((idx) => (
              <tr key={idx} className="border-b border-gray-300 h-5">
                <td className="border-r border-gray-800"></td>
                <td className="border-r border-gray-800"></td>
                <td className="border-r border-gray-800"></td>
                <td className="border-r border-gray-800"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales y Observaciones */}
      <div className="mt-3 space-y-1.5 text-[11px] text-gray-900">
        <div className="flex gap-8">
          <div>
            <span className="font-bold">Total de dosímetros devueltos: </span>
            <span className="font-semibold underline decoration-dotted">{items.length}</span>
          </div>
          <div>
            <span className="font-bold">Total de dosímetros entregados: </span>
            <span className="font-semibold underline decoration-dotted">{items.length}</span>
          </div>
        </div>

        <div>
          <span className="font-bold">Total de dosímetros NO devueltos: </span>
          <span>_________________________________________</span>
        </div>

        <div>
          <span className="font-bold">Observaciones: </span>
          <span className="text-gray-800">
            {order.observations || 'Ninguna observación registrada.'}
          </span>
        </div>
      </div>

      {/* Reporte de dosímetros contaminados */}
      <div className="mt-3">
        <p className="text-[10px] font-bold text-gray-800 mb-0.5">
          Reporte en caso de detectar dosímetros contaminados:
        </p>
        <div className="border border-gray-800 grid grid-cols-4 text-[10px] font-medium divide-x divide-gray-800">
          <div className="p-1 bg-gray-50 text-center font-bold">Rad. fondo</div>
          <div className="p-1 text-center">0.12 µSv/h</div>
          <div className="p-1 bg-gray-50 text-center font-bold">Cont. medida</div>
          <div className="p-1 text-center">&lt; 0.05 Bq/cm²</div>
        </div>
      </div>

      {/* Bloque de Firmas */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Institución */}
        <div className="border border-gray-800 p-2 space-y-1 text-[10px]">
          <div>
            <span className="font-bold">Nombre: </span>
            <span>{client?.contact_name || 'Guadalupe Gonzalez'}</span>
          </div>
          <div className="h-6 flex items-end">
            <span className="font-bold mr-1">Firma: </span>
            <span className="border-b border-gray-600 flex-1 block"></span>
          </div>
          <div>
            <span className="font-bold">De la Institución: </span>
            <span className="truncate">{client?.name || 'Institución'}</span>
          </div>
        </div>

        {/* Empresa */}
        <div className="border border-gray-800 p-2 space-y-1 text-[10px]">
          <div>
            <span className="font-bold">Nombre: </span>
            <span>{companySignee}</span>
          </div>
          <div className="h-6 flex items-end">
            <span className="font-bold mr-1">Firma: </span>
            <span className="border-b border-gray-600 flex-1 block"></span>
          </div>
          <div>
            <span className="font-bold">De la empresa: </span>
            <span>Horacio Icaza y Cía., S.A.</span>
          </div>
        </div>
      </div>

      {/* Pie de página con teléfonos */}
      <div className="mt-3 text-center text-[10px] text-gray-700 space-y-0.5">
        <p className="font-bold">Teléfonos para consultas: 2076300, 2076370.</p>
        <p className="italic font-medium">• Devolver este formulario lleno con el paquete de dosímetros.</p>
      </div>
    </div>
  );
}
