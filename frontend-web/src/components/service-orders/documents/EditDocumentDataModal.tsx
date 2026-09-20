import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ServiceOrderDetail,
  ServiceOrderDocumentData,
  Repdos01DocumentData,
  DeliveryNoteDocumentData,
} from '../../../api/serviceOrders.api';
import { updateServiceOrderDocumentData } from '../../../api/serviceOrders.api';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { SectionHead } from '../../ui/SectionHead';
import { extractApiError } from '../../../utils/api';

interface Props {
  order: ServiceOrderDetail;
  initialTab?: 'repdos01' | 'deliveryNote';
  onClose: () => void;
  onSaved: (updatedDocData: ServiceOrderDocumentData) => void;
}

export function EditDocumentDataModal({
  order,
  initialTab = 'repdos01',
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<'repdos01' | 'deliveryNote'>(initialTab);
  const existing = order.document_data || {};

  // Defaults calculados
  const client = order.clients;

  // Fecha formal por defecto
  const rawDate = order.requested_date || order.created_at;
  const dateObj = new Date(rawDate);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const month = monthNames[dateObj.getMonth()] || 'febrero';
  const year = dateObj.getFullYear() || 2026;
  const defaultCityDate = `Panamá, ${day} de ${month} del ${year}`;

  // Form State REPDOS-01
  const [repdos, setRepdos] = useState<Repdos01DocumentData>({
    company_signee: existing.repdos01?.company_signee ?? 'Ruben Samudio',
    company_role: existing.repdos01?.company_role ?? 'Técnico de Dosimetría',
    client_signee: existing.repdos01?.client_signee ?? client?.contact_name ?? 'Guadalupe Gonzalez',
    client_role: existing.repdos01?.client_role ?? 'Encargado de Protección Radiológica',
    period_label: existing.repdos01?.period_label ?? 'Actual',
    lot_number: existing.repdos01?.lot_number ?? `LOT-${year}`,
    institution_number: existing.repdos01?.institution_number ?? client?.code ?? '153825',
    observations: existing.repdos01?.observations ?? order.observations ?? '',
    background_rad: existing.repdos01?.background_rad ?? '0.12 µSv/h',
    measured_contamination: existing.repdos01?.measured_contamination ?? '< 0.05 Bq/cm²',
    consultation_phones: existing.repdos01?.consultation_phones ?? '2076300, 2076370',
  });

  // Form State Nota de Entrega
  const [delivery, setDelivery] = useState<DeliveryNoteDocumentData>({
    letter_city_date: existing.delivery_note?.letter_city_date ?? defaultCityDate,
    legal_signee: existing.delivery_note?.legal_signee ?? 'Guillermo Ungo',
    legal_id: existing.delivery_note?.legal_id ?? 'E-8-49486',
    legal_role: existing.delivery_note?.legal_role ?? 'Apoderado Legal',
    catalog_code: existing.delivery_note?.catalog_code ?? 'TLD-XBGN',
    catalog_description: existing.delivery_note?.catalog_description ?? 'DOSIMETRO DE CUERPO ENTERO',
    brand_name: existing.delivery_note?.brand_name ?? 'Radetco',
    account_number: existing.delivery_note?.account_number ?? client?.code ?? '153825',
    recipient_title: existing.delivery_note?.recipient_title ?? 'Estimado',
    recipient_name: existing.delivery_note?.recipient_name ?? client?.contact_name ?? 'Dr. Alexander Esquivel',
    recipient_institution: existing.delivery_note?.recipient_institution ?? client?.name ?? '',
    recipient_address: existing.delivery_note?.recipient_address ?? client?.address ?? '',
    closing_phrase: existing.delivery_note?.closing_phrase ?? 'Sin más que agregar.',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload: ServiceOrderDocumentData = {
      repdos01: repdos,
      delivery_note: delivery,
    };

    try {
      const res = await updateServiceOrderDocumentData(order.id, payload);
      onSaved(res.document_data);
      onClose();
    } catch (err) {
      setError(extractApiError(err, 'Error al guardar los datos de los documentos'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={`Editar datos de documentos oficiales — ${order.order_number}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Selector de Pestañas de Documento */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('repdos01')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'repdos01'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Formulario REPDOS-01 (Entrega y Recibo)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deliveryNote')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'deliveryNote'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Nota de Entrega de Mercancía
          </button>
        </div>

        {/* Pestaña: REPDOS-01 */}
        {activeTab === 'repdos01' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <SectionHead label="Firmantes y Responsables" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre de quien entrega (Empresa)"
                value={repdos.company_signee || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, company_signee: e.target.value }))}
                placeholder="Ej. Ruben Samudio"
              />
              <Input
                label="Cargo de quien entrega (Empresa)"
                value={repdos.company_role || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, company_role: e.target.value }))}
                placeholder="Ej. Técnico de Dosimetría"
              />
              <Input
                label="Persona que recibe (Institución Cliente)"
                value={repdos.client_signee || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, client_signee: e.target.value }))}
                placeholder="Ej. Guadalupe Gonzalez"
              />
              <Input
                label="Cargo de quien recibe (Institución)"
                value={repdos.client_role || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, client_role: e.target.value }))}
                placeholder="Ej. Encargado de Protección Radiológica"
              />
            </div>

            <SectionHead label="Datos del Período y Lote Físico" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Etiqueta del Período"
                value={repdos.period_label || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, period_label: e.target.value }))}
                placeholder="Ej. Febrero 2026 / Actual"
              />
              <Input
                label="Nº de Lote Físico"
                value={repdos.lot_number || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, lot_number: e.target.value }))}
                placeholder="Ej. LOT-2026-001"
              />
              <Input
                label="Nº de Cuenta / Institución"
                value={repdos.institution_number || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, institution_number: e.target.value }))}
                placeholder="Ej. 153825"
              />
            </div>

            <SectionHead label="Reporte de Verificación Radiológica & Contacto" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Radiación de fondo medida"
                value={repdos.background_rad || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, background_rad: e.target.value }))}
                placeholder="0.12 µSv/h"
              />
              <Input
                label="Contaminación medida"
                value={repdos.measured_contamination || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, measured_contamination: e.target.value }))}
                placeholder="< 0.05 Bq/cm²"
              />
              <Input
                label="Teléfonos de consulta (Pie)"
                value={repdos.consultation_phones || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, consultation_phones: e.target.value }))}
                placeholder="2076300, 2076370"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Observaciones del formulario REPDOS-01
              </label>
              <textarea
                value={repdos.observations || ''}
                onChange={(e) => setRepdos((p) => ({ ...p, observations: e.target.value }))}
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Notas que aparecerán en la sección de observaciones del formulario físico..."
              />
            </div>
          </div>
        )}

        {/* Pestaña: Nota de Entrega */}
        {activeTab === 'deliveryNote' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <SectionHead label="Encabezado y Apoderado Legal de la Empresa" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Lugar y Fecha formal"
                  value={delivery.letter_city_date || ''}
                  onChange={(e) => setDelivery((p) => ({ ...p, letter_city_date: e.target.value }))}
                  placeholder="Ej. Panamá, 01 de febrero del 2026"
                />
              </div>
              <Input
                label="Nombre del Apoderado Legal"
                value={delivery.legal_signee || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, legal_signee: e.target.value }))}
                placeholder="Ej. Guillermo Ungo"
              />
              <Input
                label="Cédula / Documento de Identidad"
                value={delivery.legal_id || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, legal_id: e.target.value }))}
                placeholder="Ej. E-8-49486"
              />
              <Input
                label="Cargo Legal"
                value={delivery.legal_role || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, legal_role: e.target.value }))}
                placeholder="Ej. Apoderado Legal"
              />
              <Input
                label="Frase de Cierre / Despedida"
                value={delivery.closing_phrase || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, closing_phrase: e.target.value }))}
                placeholder="Ej. Sin más que agregar."
              />
            </div>

            <SectionHead label="Destinatario y Membrete" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Tratamiento / Saludo"
                value={delivery.recipient_title || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, recipient_title: e.target.value }))}
                placeholder="Ej. Estimado / Estimada Dra."
              />
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del Destinatario"
                  value={delivery.recipient_name || ''}
                  onChange={(e) => setDelivery((p) => ({ ...p, recipient_name: e.target.value }))}
                  placeholder="Ej. Dr. Alexander Esquivel"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Institución Destinataria"
                  value={delivery.recipient_institution || ''}
                  onChange={(e) => setDelivery((p) => ({ ...p, recipient_institution: e.target.value }))}
                  placeholder="Ej. Universidad Tecnológica de Panamá"
                />
              </div>
              <Input
                label="Dirección de Entrega"
                value={delivery.recipient_address || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, recipient_address: e.target.value }))}
                placeholder="Ej. Campus Víctor Levi Sasso"
              />
            </div>

            <SectionHead label="Detalle de Mercancía y Catálogo" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                label="Código Catálogo"
                value={delivery.catalog_code || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, catalog_code: e.target.value }))}
                placeholder="TLD-XBGN"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Descripción de Mercancía"
                  value={delivery.catalog_description || ''}
                  onChange={(e) => setDelivery((p) => ({ ...p, catalog_description: e.target.value }))}
                  placeholder="DOSIMETRO DE CUERPO ENTERO"
                />
              </div>
              <Input
                label="Marca Comercial"
                value={delivery.brand_name || ''}
                onChange={(e) => setDelivery((p) => ({ ...p, brand_name: e.target.value }))}
                placeholder="Radetco"
              />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
