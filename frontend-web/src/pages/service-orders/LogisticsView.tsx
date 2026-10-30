import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  createDispatchGuide,
  confirmDispatchDelivery,
  createReturnGuide,
  getLogisticsSummary,
  getServiceOrder,
} from '../../api/serviceOrders.api';
import type { ServiceOrderDetail } from '../../api/serviceOrders.api';

export function LogisticsView() {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<ServiceOrderDetail | null>(null);
  const [logisticsSummary, setLogisticsSummary] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dispatch' | 'return'>('dispatch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario Hoja de Entrega
  const [carrierName, setCarrierName] = useState('Mensajería Especializada S.A.');
  const [trackingCode, setTrackingCode] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Formulario Confirmación de Entrega en Cliente
  const [confirmRecipientName, setConfirmRecipientName] = useState('');
  const [confirmRecipientDoc, setConfirmRecipientDoc] = useState('');

  // Formulario Hoja de Devolución
  const [returnCarrier, setReturnCarrier] = useState('Mensajería Especializada S.A.');
  const [returnNotes, setReturnNotes] = useState('');

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  const loadOrderData = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const [ordData, logData] = await Promise.all([
        getServiceOrder(orderId),
        getLogisticsSummary(orderId),
      ]);
      setOrder(ordData);
      setLogisticsSummary(logData);
      if (ordData.clients?.address) {
        setRecipientAddress(ordData.clients.address);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar datos logísticos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const res = await createDispatchGuide(orderId, {
        carrier_name: carrierName,
        carrier_tracking_code: trackingCode,
        recipient_facility_address: recipientAddress,
      });
      setSuccessMsg(`Hoja de Entrega emitida: ${res.guide?.guide_number || 'OK'}`);
      loadOrderData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al emitir hoja de entrega.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (guideId: string) => {
    if (!orderId || !confirmRecipientName) {
      setError('Ingrese el nombre de la persona que recibe en la sede del cliente.');
      return;
    }
    setError(null);
    try {
      setLoading(true);
      await confirmDispatchDelivery(orderId, guideId, {
        received_by_name: confirmRecipientName,
        received_by_document: confirmRecipientDoc,
      });
      setSuccessMsg('Entrega en sede de cliente confirmada satisfactoriamente.');
      setConfirmRecipientName('');
      setConfirmRecipientDoc('');
      loadOrderData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al confirmar entrega.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order) return;
    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const items = (order.service_order_items || []).map((i: any) => ({
        dosimeter_id: i.dosimeters?.id || i.dosimeter_id,
        worker_id: i.dosimeters?.assigned_worker?.id || undefined,
        returned_condition: 'bueno',
      }));

      const res = await createReturnGuide(orderId, {
        carrier_name: returnCarrier,
        notes: returnNotes,
        items,
      });
      setSuccessMsg(`Hoja de Devolución registrada: ${res.guide?.return_guide_number || 'OK'}`);
      loadOrderData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar hoja de devolución.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <button
          onClick={() => navigate('/service-orders')}
          className="text-xs text-blue-600 hover:underline mb-1 cursor-pointer"
        >
          ← Volver a Órdenes de Servicio
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Logística Desacoplada: Orden {order?.order_number || orderId}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Cliente: <strong>{order?.clients?.name}</strong> | Práctica: <strong>{order?.radiological_practice || 'Radiodiagnóstico'}</strong> | Total Dosímetros: <strong>{order?.service_order_items?.length || 0}</strong>
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">
          {successMsg}
        </div>
      )}

      {/* Resumen Logístico */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Dosímetros en Orden</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logisticsSummary?.summary?.total_order_items ?? order?.service_order_items?.length ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Hojas de Entrega</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{logisticsSummary?.summary?.total_dispatch_guides ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Hojas de Devolución</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{logisticsSummary?.summary?.total_return_guides ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Estado General</span>
          <p className="text-sm font-bold text-gray-800 mt-2 uppercase">{order?.status || 'EN PROCESO'}</p>
        </div>
      </div>

      {/* Selector de Pestaña */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`pb-3 text-sm font-medium border-b-2 cursor-pointer ${
            activeTab === 'dispatch'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 Hoja de Entrega (Despacho a Sede Cliente)
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`pb-3 text-sm font-medium border-b-2 cursor-pointer ${
            activeTab === 'return'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📥 Hoja de Devolución (Retorno al Laboratorio)
        </button>
      </div>

      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Emitir Guía */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-800">Emitir Nueva Hoja de Entrega</h3>
            <form onSubmit={handleCreateDispatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Empresa de Transporte / Courier</label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Código de Seguimiento / Guía Courier</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ej: TRK-982138"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección de Entrega</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded text-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Emitiendo...' : 'Emitir Hoja de Entrega'}
              </button>
            </form>
          </div>

          {/* Guías Emitidas y Confirmación */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-800">Guías de Entrega de la Orden</h3>
            {(!logisticsSummary?.dispatch_guides || logisticsSummary.dispatch_guides.length === 0) ? (
              <p className="text-xs text-gray-500 py-6 text-center">No se han emitido guías de entrega aún.</p>
            ) : (
              <div className="space-y-4">
                {logisticsSummary.dispatch_guides.map((g: any) => (
                  <div key={g.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-blue-700">{g.guide_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        g.status === 'ENTREGADO' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {g.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Transportista: {g.carrier_name} {g.carrier_tracking_code && `(${g.carrier_tracking_code})`}
                    </p>
                    {g.status !== 'ENTREGADO' ? (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <span className="block text-[11px] font-semibold text-gray-700">Confirmar Recepción en Cliente:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nombre Receptor"
                            value={confirmRecipientName}
                            onChange={(e) => setConfirmRecipientName(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Cédula / DNI"
                            value={confirmRecipientDoc}
                            onChange={(e) => setConfirmRecipientDoc(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          />
                        </div>
                        <button
                          onClick={() => handleConfirmDelivery(g.id)}
                          className="w-full bg-green-600 text-white font-semibold py-1 rounded text-xs hover:bg-green-700 cursor-pointer"
                        >
                          Confirmar Entrega
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-green-700 font-medium">
                        Recibido por: {g.received_by_name} ({g.received_by_document || 'S/D'}) el {new Date(g.delivered_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'return' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Registrar Hoja de Devolución */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-800">Registrar Hoja de Devolución Física</h3>
            <form onSubmit={handleCreateReturn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Courier / Persona que Retorna</label>
                <input
                  type="text"
                  value={returnCarrier}
                  onChange={(e) => setReturnCarrier(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Detalles sobre precintos, estado de empaque..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-medium py-2 rounded text-sm hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrar Hoja de Devolución'}
              </button>
            </form>
          </div>

          {/* Guías de Retorno Registradas */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-800">Hojas de Devolución Recibidas</h3>
            {(!logisticsSummary?.return_guides || logisticsSummary.return_guides.length === 0) ? (
              <p className="text-xs text-gray-500 py-6 text-center">No se han registrado devoluciones aún.</p>
            ) : (
              <div className="space-y-3">
                {logisticsSummary.return_guides.map((rg: any) => (
                  <div key={rg.id} className="p-3 border border-gray-200 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-indigo-700">{rg.return_guide_number}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">
                        {rg.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Fecha: {new Date(rg.returned_at).toLocaleString()} | Courier: {rg.carrier_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total items devueltos: {rg.return_guide_items?.length || 0}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default LogisticsView;
