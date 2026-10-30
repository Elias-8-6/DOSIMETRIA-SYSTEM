import { useState, useEffect } from 'react';
import {
  reportsApi,
} from '../../api/reports.api';
import type {
  ExcessiveDoseAlert,
  OfficialReportSummary,
  WorkerHistoryResponse,
} from '../../api/reports.api';
import { getClients } from '../../api/clients.api';
import type { Client } from '../../api/clients.api';
import { getWorkers } from '../../api/workers.api';
import type { Worker } from '../../api/workers.api';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'monthly' | 'history' | 'archive'>('alerts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para alertas críticas (>2.0 mSv)
  const [alerts, setAlerts] = useState<ExcessiveDoseAlert[]>([]);
  const [selectedAlertForReport, setSelectedAlertForReport] = useState<ExcessiveDoseAlert | null>(null);
  const [urgentSummary, setUrgentSummary] = useState('');
  const [urgentActions, setUrgentActions] = useState('');

  // Estados para emisión mensual
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [dosimetryNotes, setDosimetryNotes] = useState('');

  // Estados para historial POE
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workerHistory, setWorkerHistory] = useState<WorkerHistoryResponse | null>(null);

  // Estados para archivo oficial
  const [officialReports, setOfficialReports] = useState<OfficialReportSummary[]>([]);
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  useEffect(() => {
    loadAlerts();
    loadClients();
    loadWorkers();
    loadReportsArchive();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getExcessiveDoseAlerts();
      setAlerts(res.alerts);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar alertas críticas.');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await getClients({ limit: 100 });
      setClients(res.items);
      if (res.items.length > 0) setSelectedClientId(res.items[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadWorkers = async () => {
    try {
      const res = await getWorkers({ limit: 100 });
      setWorkers(res.items);
      if (res.items.length > 0) setSelectedWorkerId(res.items[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportsArchive = async () => {
    try {
      const res = await reportsApi.getOfficialReports();
      setOfficialReports(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const res = await reportsApi.generateMonthlyReport({
        client_id: selectedClientId,
        period_year: Number(periodYear),
        period_month: Number(periodMonth),
        dosimetry_notes: dosimetryNotes,
      });
      setSuccessMsg(`Informe oficial emitido: ${res.report?.report_number}`);
      loadReportsArchive();
      setActiveTab('archive');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al generar informe mensual.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWorkerHistory = async () => {
    if (!selectedWorkerId) return;
    setError(null);
    try {
      setLoading(true);
      const res = await reportsApi.getWorkerHistory(selectedWorkerId);
      setWorkerHistory(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al obtener historial del trabajador.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitUrgentReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForReport) return;
    setError(null);
    try {
      setLoading(true);
      const res = await reportsApi.generateUrgentExcessiveDoseReport({
        reading_id: selectedAlertForReport.reading_id,
        incident_report_id: selectedAlertForReport.incident_report_id || undefined,
        investigation_summary: urgentSummary,
        corrective_actions: urgentActions,
      });
      setSuccessMsg(`Informe urgente generado: ${res.report?.report_number}`);
      setSelectedAlertForReport(null);
      setUrgentSummary('');
      setUrgentActions('');
      loadAlerts();
      loadReportsArchive();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al emitir informe urgente.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReportDetail = async (reportId: string) => {
    try {
      setLoading(true);
      const res = await reportsApi.getReportById(reportId);
      setViewingReport(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al obtener el informe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Regulatorios Minsa e ISO 17025</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de eventos centinela, alertas críticas (&gt;2.0 mSv) y emisión de informes inmutables con sello SHA-256.
          </p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 text-sm font-semibold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            {alerts.length} Alerta(s) de Dosis Excesiva (&gt;2.0 mSv)
          </div>
        )}
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

      {/* Pestañas */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚨 Alertas Críticas ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📄 Emitir Informe Mensual
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👤 Historial POE (50-75 años)
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'archive'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🗄️ Archivo Oficial ({officialReports.length})
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900">
            <strong>Criterio Normativo Minsa:</strong> Toda dosis mensual superior a <strong>2.0 mSv</strong> representa más del 10% del límite anual (20 mSv/año) y exige el retiro preventivo del trabajador y la apertura obligatoria de investigación técnica del OPR.
          </div>

          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
              No hay alertas críticas de dosis excesiva pendientes de atención.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Dosis Hp(10)</th>
                    <th className="px-4 py-3 text-left">Trabajador POE</th>
                    <th className="px-4 py-3 text-left">Cliente / Empresa</th>
                    <th className="px-4 py-3 text-left">Dosímetro</th>
                    <th className="px-4 py-3 text-left">Incidente</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alerts.map((alert) => (
                    <tr key={alert.reading_id} className="hover:bg-red-50/40">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(alert.read_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">
                        {alert.hp10 ? `${alert.hp10} mSv` : `${alert.measured_dose} mSv`}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {alert.worker_full_name || 'Sin asignar'}
                        {alert.worker_document_number && (
                          <span className="block text-xs text-gray-400 font-normal">
                            DNI: {alert.worker_document_number}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {alert.client_name || 'Desconocido'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {alert.dosimeter_serial}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">
                          {alert.incident_status || 'ABIERTO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedAlertForReport(alert)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 cursor-pointer"
                        >
                          Emitir Informe Urgente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Emisión de Informe Mensual de Vigilancia</h2>
          <form onSubmit={handleGenerateMonthly} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Empresa / Cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || 'S/C'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Año</label>
                <input
                  type="number"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Mes</label>
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('es', { month: 'long' }).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Observaciones Metrológicas / Notas</label>
              <textarea
                value={dosimetryNotes}
                onChange={(e) => setDosimetryNotes(e.target.value)}
                placeholder="Observaciones de fondo, control de calidad o circunstancias del periodo..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Generando Sello Criptográfico...' : 'Emitir Informe Oficial con Sello SHA-256'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Seleccionar Trabajador POE</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} — DNI: {w.document_number || 'S/D'} ({w.occupation || 'POE'})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleFetchWorkerHistory}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 cursor-pointer"
            >
              Consultar Historial (50-75 Años)
            </button>
          </div>

          {workerHistory && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
              <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{workerHistory.data.worker_profile.full_name}</h3>
                  <p className="text-xs text-gray-500">
                    Cédula/DNI: {workerHistory.data.worker_profile.document_number} | Ocupación: {workerHistory.data.worker_profile.occupation}
                  </p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    Retención legal: {workerHistory.data.retention_legal_period}
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-gray-400">
                  SHA-256: {workerHistory.integrity_hash.slice(0, 16)}...
                </div>
              </div>

              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-500 font-medium">Dosis Total Vida Laboral Hp(10)</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {workerHistory.data.lifetime_summary.lifetime_total_hp10_mSv} mSv
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-500 font-medium">Evaluaciones Registradas</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {workerHistory.data.lifetime_summary.total_evaluations_count}
                  </p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs text-red-700 font-medium">Alertas Críticas Históricas (&gt;2.0 mSv)</span>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {workerHistory.data.lifetime_summary.critical_alerts_total_count}
                  </p>
                </div>
              </div>

              {/* Desglose Anual */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 uppercase mb-3">Consumo de Límite Anual por Año (20 mSv/año)</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2 text-left">Año</th>
                        <th className="px-4 py-2 text-left">Lecturas</th>
                        <th className="px-4 py-2 text-left">Dosis Hp(10)</th>
                        <th className="px-4 py-2 text-left">% Límite Anual</th>
                        <th className="px-4 py-2 text-left">Alertas Críticas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {workerHistory.data.yearly_breakdown.map((y) => (
                        <tr key={y.year}>
                          <td className="px-4 py-2 font-bold text-gray-900">{y.year}</td>
                          <td className="px-4 py-2 text-gray-600">{y.readings_count}</td>
                          <td className="px-4 py-2 font-semibold text-gray-800">{y.total_hp10_mSv} mSv</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${y.limit_consumed_percentage > 50 ? 'bg-red-500' : 'bg-blue-600'}`}
                                  style={{ width: `${Math.min(y.limit_consumed_percentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{y.limit_consumed_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {y.critical_alerts_count > 0 ? (
                              <span className="text-xs text-red-600 font-bold">⚠️ {y.critical_alerts_count}</span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Número Oficial</th>
                <th className="px-4 py-3 text-left">Tipo de Informe</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Periodo</th>
                <th className="px-4 py-3 text-left">Sello SHA-256</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {officialReports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {r.report_number}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {r.report_type}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {r.clients?.name || 'Cliente'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {r.period_month ? `${String(r.period_month).padStart(2, '0')}/` : ''}{r.period_year}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    <span className="text-green-700 font-semibold mr-1">✓</span>
                    {r.integrity_hash.slice(0, 10)}...
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleViewReportDetail(r.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium cursor-pointer"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Formulario de Informe Urgente de Dosis Excesiva */}
      {selectedAlertForReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 border-b border-gray-200 pb-2">
              🚨 Emisión de Informe Técnico Urgente Minsa
            </h3>
            <p className="text-xs text-gray-600">
              Lectura crítica: <strong>{selectedAlertForReport.hp10 || selectedAlertForReport.measured_dose} mSv</strong> | Trabajador: <strong>{selectedAlertForReport.worker_full_name}</strong>
            </p>

            <form onSubmit={handleEmitUrgentReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Resumen de Investigación Técnica de la Causa
                </label>
                <textarea
                  value={urgentSummary}
                  onChange={(e) => setUrgentSummary(e.target.value)}
                  placeholder="Detallar causa técnica preliminar (e.g. exposición accidental, falla en disparador, dosímetro dejado en sala...)"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Acciones Correctivas y Medidas Preventivas
                </label>
                <textarea
                  value={urgentActions}
                  onChange={(e) => setUrgentActions(e.target.value)}
                  placeholder="Medidas inmediatas: retiro temporal del POE, revisión de blindajes, control médico..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForReport(null)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 cursor-pointer"
                >
                  {loading ? 'Emitiendo...' : 'Emitir y Sellar Informe Urgente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visor de Informe Oficial y Verificación Criptográfica */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingReport.report.report_number}</h3>
                <span className="text-xs text-gray-500">
                  Emitido el: {new Date(viewingReport.report.issued_at).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${
                  viewingReport.cryptographic_verification.is_authentic
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {viewingReport.cryptographic_verification.is_authentic ? '🛡️ SELLO SHA-256 VÁLIDO (ISO 17025)' : '⚠️ INTEGRIDAD COMPROMETIDA'}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 bg-gray-50 rounded border border-gray-200 text-xs font-mono space-y-2">
              <p><strong>Hash Guardado:</strong> {viewingReport.cryptographic_verification.stored_hash}</p>
              <p><strong>Hash Verificado:</strong> {viewingReport.cryptographic_verification.computed_hash}</p>
              <pre className="mt-4 p-3 bg-white rounded border border-gray-300 overflow-x-auto">
                {JSON.stringify(viewingReport.report.content_data, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ReportsPage;
