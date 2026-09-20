import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ReceptionDetail } from '../../api/receptions.api';
import { getReceptionById } from '../../api/receptions.api';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { PackagingConditionBadge } from '../../components/receptions/PackagingConditionBadge';
import { ReceptionItemConditionBadge } from '../../components/receptions/ReceptionItemConditionBadge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils/date';
import { formatImageUrl } from '../../utils/imageUrl';

export default function ReceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reception, setReception] = useState<ReceptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await getReceptionById(id);
        setReception(data);
      } catch {
        setError('No se pudo cargar el detalle de la recepción física');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 text-sm">Cargando detalle de la recepción...</div>
      </div>
    );
  }

  if (error || !reception) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-4">
          {error || 'Recepción no encontrada'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/receptions')}>
          Volver a Recepciones
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={`Recepción ${reception.reception_code}`}
        subtitle="Constancia y verificación física de ingreso de dosímetros (ISO 17025)"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/receptions')}>
              ← Volver al listado
            </Button>
          </div>
        }
      />

      {/* Tarjeta de Información General del Paquete */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4 border-b pb-2">
          Datos Generales del Ingreso
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="text-xs text-gray-500 block">Orden de Servicio</span>
            <button
              onClick={() => navigate(`/service-orders/${reception.service_order_id}`)}
              className="font-semibold text-blue-600 hover:underline mt-0.5 text-base"
            >
              {reception.service_orders?.order_number} ↗
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Cliente Institucional</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {reception.service_orders?.clients?.name ?? '—'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Fecha y Hora de Recepción</span>
            <span className="text-gray-800 mt-0.5 block font-medium">
              {formatDate(reception.received_at)}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Estado del Embalaje Exterior</span>
            <PackagingConditionBadge condition={reception.packaging_condition} />
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Receptor Técnico (ISO 17025)</span>
            <span className="text-gray-800 mt-0.5 block font-medium">
              {reception.users?.full_name ?? '—'}
            </span>
            <span className="text-xs text-gray-400">{reception.users?.email}</span>
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Total de Dosímetros Verificados</span>
            <span className="text-base font-bold text-gray-900 mt-0.5 block">
              {reception.reception_items?.length ?? 0} unidades
            </span>
          </div>
        </div>

        {reception.observations && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 block">Observaciones Generales del Paquete:</span>
            <p className="text-sm text-gray-700 mt-1 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              "{reception.observations}"
            </p>
          </div>
        )}
      </div>

      {/* Tabla de Dosímetros Inspeccionados */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center justify-between">
          <span>Dosímetros Inspeccionados</span>
          <span className="text-xs font-normal text-gray-500">
            {reception.reception_items?.length} dosímetros recibidos
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Dosímetro</th>
                <th className="px-4 py-3 text-left">Tecnología / Modelo</th>
                <th className="px-4 py-3 text-left">Condición Recibida</th>
                <th className="px-4 py-3 text-center">Sello</th>
                <th className="px-4 py-3 text-center">Contaminación</th>
                <th className="px-4 py-3 text-left">Evidencia Fotográfica</th>
                <th className="px-4 py-3 text-left">Incidentes Detectados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reception.reception_items?.map((item) => {
                const hasIncident =
                  (item.incident_reports && item.incident_reports.length > 0) ||
                  item.contaminated ||
                  !item.sealed ||
                  item.received_condition !== 'normal';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      hasIncident ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        {item.dosimeters?.photo_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActivePhotoModal({
                                url: formatImageUrl(item.dosimeters?.photo_url),
                                title: `Dosímetro ${item.dosimeters.serial_number} — Foto Registrada`,
                              })
                            }
                            className="w-11 h-11 shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-blue-500 cursor-pointer transition-all shadow-xs"
                            title="Ver fotografía registrada del dosímetro"
                          >
                            <img
                              src={formatImageUrl(item.dosimeters.photo_url)}
                              alt={item.dosimeters.serial_number}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-11 h-11 shrink-0 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
                            Sin foto
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{item.dosimeters?.serial_number}</div>
                          <div className="text-xs text-gray-400">
                            {item.dosimeters?.internal_code || 'Sin cód. interno'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      <div>{item.dosimeters?.dosimeter_types?.name || 'TLD'}</div>
                      <div className="text-xs text-gray-400">
                        {item.dosimeters?.manufacturer || ''} {item.dosimeters?.model || ''}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <ReceptionItemConditionBadge condition={item.received_condition} />
                      {item.observations && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          {item.observations}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.sealed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                          ✓ Íntegro
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                          ✕ Roto
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.contaminated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-900 animate-pulse">
                          ⚠ SÍ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          No
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.condition_photo_url ? (
                        <button
                          onClick={() =>
                            setActivePhotoModal({
                              url: formatImageUrl(item.condition_photo_url),
                              title: `Evidencia de Recepción — Dosímetro ${item.dosimeters?.serial_number || ''}`,
                            })
                          }
                          className="group relative block overflow-hidden rounded-lg border border-gray-200 hover:border-blue-500 w-11 h-11 shadow-xs cursor-pointer"
                          title="Ver fotografía de evidencia de recepción"
                        >
                          <img
                            src={formatImageUrl(item.condition_photo_url)}
                            alt="Evidencia"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin foto</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.incident_reports && item.incident_reports.length > 0 ? (
                        <div className="space-y-1">
                          {item.incident_reports.map((inc) => (
                            <div
                              key={inc.id}
                              className="text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded p-1.5"
                            >
                              <div className="font-semibold uppercase tracking-wider">
                                {inc.incident_type} ({inc.severity})
                              </div>
                              <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                                {inc.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Sin anomalías</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para visualizar foto de evidencia o foto de dosímetro en tamaño completo */}
      {activePhotoModal && (
        <Modal
          onClose={() => setActivePhotoModal(null)}
          title={activePhotoModal.title}
        >
          <div className="p-4 flex flex-col items-center">
            <img
              src={activePhotoModal.url}
              alt="Fotografía completa"
              className="max-h-[70vh] rounded-lg object-contain border border-gray-200 shadow-md"
            />
            <div className="mt-4 flex justify-between items-center w-full">
              <a
                href={activePhotoModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Abrir en pestaña nueva ↗
              </a>
              <Button variant="secondary" onClick={() => setActivePhotoModal(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
