import { useState } from 'react';
import type { ServiceOrderDetail } from '../../../api/serviceOrders.api';
import { Repdos01Document } from './Repdos01Document';
import { DeliveryNoteDocument } from './DeliveryNoteDocument';
import { Button } from '../../ui/Button';

interface Props {
  order: ServiceOrderDetail;
  initialDocument?: 'repdos01' | 'deliveryNote';
  onClose: () => void;
}

export function DocumentPreviewModal({
  order,
  initialDocument = 'repdos01',
  onClose,
}: Props) {
  const [activeDoc, setActiveDoc] = useState<'repdos01' | 'deliveryNote'>(initialDocument);
  const [companySignee, setCompanySignee] = useState('Ruben Samudio');
  const [legalSignee, setLegalSignee] = useState('Guillermo Ungo');
  const [brandName, setBrandName] = useState('Radetco');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Container - on print this will show only the document */}
      <div className="bg-gray-100 rounded-2xl shadow-2xl border border-gray-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:bg-white print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-auto print:p-0">
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveDoc('repdos01')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  activeDoc === 'repdos01'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Formulario REPDOS-01
              </button>
              <button
                type="button"
                onClick={() => setActiveDoc('deliveryNote')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  activeDoc === 'deliveryNote'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📦 Nota de Entrega
              </button>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              Orden: {order.order_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={handlePrint}>
              🖨️ Imprimir / Guardar PDF
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2 py-1 cursor-pointer"
              title="Cerrar vista previa"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Settings Bar - Hidden on Print */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-gray-600 print:hidden">
          {activeDoc === 'repdos01' ? (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Firmante Empresa:</span>
                <input
                  type="text"
                  value={companySignee}
                  onChange={(e) => setCompanySignee(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                  placeholder="Nombre de quien entrega"
                />
              </label>
              <span className="text-gray-400">|</span>
              <span>
                Total dosímetros en orden: <strong>{order.service_order_items?.length || 0}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Apoderado / Firmante:</span>
                <input
                  type="text"
                  value={legalSignee}
                  onChange={(e) => setLegalSignee(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Marca:</span>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white w-24"
                />
              </label>
            </div>
          )}

          <div className="text-[11px] text-gray-500 italic">
            Formato fiel a la documentación física oficial
          </div>
        </div>

        {/* Document Content View */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          <div className="printable-document">
            {activeDoc === 'repdos01' ? (
              <Repdos01Document order={order} companySignee={companySignee} />
            ) : (
              <DeliveryNoteDocument
                order={order}
                legalSignee={legalSignee}
                brandName={brandName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
