"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatMonto, formatFecha, exportToCSV } from "@/lib/utils";
import {
  Plus,
  Calendar,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  History,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  X,
  Check,
  Zap
} from "lucide-react";

interface Prestador { id: number; nombre: string; nombre_corto: string; }
interface Tarifario {
  id: number;
  prestador_id: number;
  tipo_servicio: string;
  zona: string | null;
  costo_servicio: number;
  costo_km: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

interface GroupedService {
  tipo_servicio: string;
  zona: string | null;
  history: Tarifario[];
  active: Tarifario | null;
}

const TIPOS = [
  { value: "correctivo", label: "Correctivo" },
  { value: "preventivo", label: "Preventivo" },
  { value: "instalacion_desinstalacion", label: "Instalación/Desinstalación" },
  { value: "pre_correctivo", label: "Pre-Correctivo" },
  { value: "guardia", label: "Guardia" },
  { value: "sistemas", label: "Sistemas" }
];

const EMPTY = { prestador_id: "", tipo_servicio: "correctivo", zona: "", costo_servicio: "", costo_km: "", vigencia_desde: "", vigencia_hasta: "" };

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function TarifariosPage() {
  const [items, setItems] = useState<Tarifario[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [filtroP, setFiltroP] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});
  const xlsxRef = useRef<HTMLInputElement>(null);

  const load = () => api.getTarifarios(filtroP ? Number(filtroP) : undefined).then(setItems);
  useEffect(() => { api.getPrestadores().then(setPrestadores); }, []);
  useEffect(() => { load(); }, [filtroP]);

  const handleSave = async () => {
    setError("");
    const payload = {
      ...form,
      prestador_id: Number(form.prestador_id),
      costo_servicio: Number(form.costo_servicio),
      costo_km: Number(form.costo_km),
      zona: form.zona || null,
      vigencia_hasta: form.vigencia_hasta || null,
    };
    try {
      if (editId) await api.updateTarifario(editId, payload);
      else await api.createTarifario(payload);
      setForm(EMPTY);
      setEditId(null);
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleEdit = (t: Tarifario) => {
    setEditId(t.id);
    setForm({
      prestador_id: String(t.prestador_id),
      tipo_servicio: t.tipo_servicio,
      zona: t.zona || "",
      costo_servicio: String(t.costo_servicio),
      costo_km: String(t.costo_km),
      vigencia_desde: t.vigencia_desde,
      vigencia_hasta: t.vigencia_hasta || "",
    });
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditId(null);
    setForm({
      ...EMPTY,
      prestador_id: filtroP || (prestadores[0]?.id ? String(prestadores[0].id) : ""),
      vigencia_desde: new Date().toISOString().split("T")[0]
    });
    setShowModal(true);
  };

  const handleUpdateActive = (service: GroupedService, prestadorId: number) => {
    setEditId(null);
    setForm({
      prestador_id: String(prestadorId),
      tipo_servicio: service.tipo_servicio,
      zona: service.zona || "",
      costo_servicio: String(service.active?.costo_servicio ?? ""),
      costo_km: String(service.active?.costo_km ?? ""),
      vigencia_desde: new Date().toISOString().split("T")[0],
      vigencia_hasta: ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de tarifa?")) {
      await api.deleteTarifario(id);
      load();
    }
  };

  const handleExport = () => {
    exportToCSV(
      items.map((t) => {
        const pst = prestadores.find((p) => p.id === t.prestador_id);
        return {
          prestador: pst?.nombre_corto ?? "",
          tipo_servicio: t.tipo_servicio,
          zona: t.zona || "",
          costo_servicio: t.costo_servicio,
          costo_km: t.costo_km,
          vigencia_desde: t.vigencia_desde,
          vigencia_hasta: t.vigencia_hasta || "",
        };
      }),
      "tarifarios.csv"
    );
  };

  const handleDescargarPlantilla = () => {
    triggerDownload(api.plantillaTarifariosUrl, "plantilla_tarifarios.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setImportStatus({ msg: `Procesando ${file.name}...`, type: "info" });
    try {
      const result = await api.importarExcelTarifarios(file);
      if (result.detail) {
        setImportStatus({ msg: result.detail, type: "err" });
      } else {
        setImportStatus({
          msg: `Importación exitosa para ${result.prestador} (${result.vigencia_desde}): ${result.creados} tarifas creadas, ${result.omitidos} ya existían.`,
          type: result.creados > 0 ? "ok" : "info",
        });
        load();
      }
    } catch (err) {
      setImportStatus({ msg: err instanceof Error ? err.message : "Error al importar", type: "err" });
    } finally {
      setImportando(false);
      if (xlsxRef.current) xlsxRef.current.value = "";
    }
  };

  const toggleHistory = (key: string) => {
    setExpandedHistories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group services
  const getGroupedServices = (prestadorItems: Tarifario[]): GroupedService[] => {
    const map: Record<string, GroupedService> = {};
    const todayStr = new Date().toISOString().split("T")[0];

    prestadorItems.forEach(t => {
      const key = `${t.tipo_servicio}::${t.zona || ""}`;
      if (!map[key]) {
        map[key] = {
          tipo_servicio: t.tipo_servicio,
          zona: t.zona,
          history: [],
          active: null
        };
      }
      map[key].history.push(t);
    });

    Object.values(map).forEach(service => {
      // sort desc by date
      service.history.sort((a, b) => b.vigencia_desde.localeCompare(a.vigencia_desde));
      
      // Find active: the first one where vigencia_desde <= today and (vigencia_hasta is null or >= today)
      const active = service.history.find(t => 
        t.vigencia_desde <= todayStr && 
        (t.vigencia_hasta === null || t.vigencia_hasta >= todayStr)
      );
      service.active = active || service.history[0] || null;
    });

    return Object.values(map).sort((a, b) => a.tipo_servicio.localeCompare(b.tipo_servicio));
  };

  const calculateVariation = (current: number, previous: number) => {
    if (!previous) return null;
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    return {
      diff,
      pct,
      isIncrease: diff > 0,
      isDecrease: diff < 0
    };
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Estructura de Tarifarios</h2>
          <p className="text-sm text-slate-500 mt-1">Configuración e historial de costos de servicios y traslados por prestador</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleDescargarPlantilla}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Plantilla
          </button>
          <label className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer border transition-all shadow-sm ${
            importando
              ? "border-slate-100 text-slate-400 bg-slate-50 cursor-not-allowed"
              : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
          }`}>
            <Upload className="w-3.5 h-3.5" />
            {importando ? "Importando..." : "Importar Excel"}
            <input
              ref={xlsxRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importando}
              onChange={handleImportExcel}
            />
          </label>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white border border-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarifa
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`text-sm px-4 py-3 rounded-lg border flex items-center justify-between transition-all ${
          importStatus.type === "ok"  ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          importStatus.type === "err" ? "bg-rose-50 border-rose-200 text-rose-800" :
                                        "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{importStatus.msg}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrar por Prestador:</span>
            <select 
              value={filtroP} 
              onChange={(e) => setFiltroP(e.target.value)}
              className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 shadow-sm"
            >
              <option value="">Todos los prestadores</option>
              {prestadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_corto} ({p.nombre})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-full">
            {items.length} tarifas cargadas en total
          </span>
        </div>

        {/* Prestadores list */}
        {prestadores
          .filter(p => !filtroP || p.id === Number(filtroP))
          .map((p) => {
            const prestadorItems = items.filter((t) => t.prestador_id === p.id);
            const groupedServices = getGroupedServices(prestadorItems);

            if (groupedServices.length === 0) {
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-md font-bold text-slate-800">{p.nombre}</h3>
                  <p className="text-xs text-slate-500 mt-1">Este prestador no tiene tarifas cargadas actualmente.</p>
                  <button 
                    onClick={() => {
                      setForm({ ...EMPTY, prestador_id: String(p.id), vigencia_desde: new Date().toISOString().split("T")[0] });
                      setEditId(null);
                      setShowModal(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Configurar tarifas iniciales
                  </button>
                </div>
              );
            }

            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Prestador header */}
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">PST CORRESPONDIENTE</span>
                    <h3 className="text-lg font-bold text-slate-800 mt-1 flex items-center gap-2">
                      {p.nombre}
                      <span className="text-xs font-mono font-medium text-slate-400">({p.nombre_corto})</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setForm({
                        ...EMPTY,
                        prestador_id: String(p.id),
                        vigencia_desde: new Date().toISOString().split("T")[0]
                      });
                      setEditId(null);
                      setShowModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Tarifa
                  </button>
                </div>

                {/* Services list */}
                <div className="divide-y divide-slate-100">
                  {groupedServices.map((service) => {
                    const svcKey = `${p.id}-${service.tipo_servicio}-${service.zona || "general"}`;
                    const isExpanded = !!expandedHistories[svcKey];

                    return (
                      <div key={svcKey} className="p-6 space-y-4 hover:bg-slate-50/40 transition-colors">
                        {/* Service main header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                              <Zap className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-md capitalize">
                                {service.tipo_servicio.replace(/_/g, " ")}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <span>Zona:</span>
                                <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {service.zona || "Toda la cobertura"}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Active values summary */}
                          {service.active && (
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="bg-indigo-50/60 rounded-xl px-4 py-2 border border-indigo-100/50 flex flex-col text-right">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Costo Servicio</span>
                                <span className="text-md font-bold text-indigo-900 mt-0.5">{formatMonto(service.active.costo_servicio)}</span>
                              </div>
                              <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 flex flex-col text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Costo KM</span>
                                <span className="text-md font-bold text-slate-700 mt-0.5">{formatMonto(service.active.costo_km)}/km</span>
                              </div>
                              <div className="bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100/50 flex flex-col text-right">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Desde</span>
                                <span className="text-xs font-semibold text-emerald-800 mt-0.5">{formatFecha(service.active.vigencia_desde)}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 ml-2">
                                <button
                                  onClick={() => handleUpdateActive(service, p.id)}
                                  className="text-xs font-semibold bg-white text-indigo-600 border border-slate-200 hover:border-indigo-600 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  Actualizar
                                </button>
                                <button
                                  onClick={() => toggleHistory(svcKey)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>Historial ({service.history.length})</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Collapsed history list (timeline) */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-4 transition-all duration-300">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Línea de tiempo de tarifas</h5>
                            <div className="relative pl-6 border-l border-slate-200 space-y-6">
                              {service.history.map((hist, idx) => {
                                // Compare with next one in array (which is chronologically older)
                                const older = service.history[idx + 1];
                                const variation = older ? calculateVariation(hist.costo_servicio, older.costo_servicio) : null;
                                const isCurrent = service.active?.id === hist.id;

                                return (
                                  <div key={hist.id} className="relative">
                                    {/* Timeline indicator dot */}
                                    <span className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                                      isCurrent ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-300"
                                    }`} />

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-bold text-slate-800">{formatMonto(hist.costo_servicio)}</span>
                                          <span className="text-xs text-slate-500">|</span>
                                          <span className="text-xs font-medium text-slate-600">{formatMonto(hist.costo_km)}/km</span>
                                          
                                          {isCurrent && (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                              Vigente hoy
                                            </span>
                                          )}

                                          {/* Price variation indicator */}
                                          {variation && (
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                              variation.isIncrease ? "bg-emerald-50 text-emerald-700" : 
                                              variation.isDecrease ? "bg-rose-50 text-rose-700" : 
                                                                    "bg-slate-100 text-slate-600"
                                            }`}>
                                              {variation.isIncrease ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                              {variation.pct === 0 ? "Sin cambios" : `${variation.isIncrease ? "+" : ""}${variation.pct.toFixed(1)}%`}
                                            </span>
                                          )}
                                          {!older && (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                              Inicial
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Periodo:</span>
                                          <span className="font-semibold text-slate-700">{formatFecha(hist.vigencia_desde)}</span>
                                          <span>al</span>
                                          <span className="font-semibold text-slate-700">{hist.vigencia_hasta ? formatFecha(hist.vigencia_hasta) : "actualidad"}</span>
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleEdit(hist)}
                                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(hist.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Slide-over or overlay Modal for creation/editing */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                {editId ? "Editar Tarifario" : "Nueva Tarifa / Actualización"}
              </h3>
              <button 
                onClick={() => { setForm(EMPTY); setEditId(null); setShowModal(false); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Prestador *</label>
                  <select 
                    value={form.prestador_id} 
                    onChange={(e) => setForm({ ...form, prestador_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecciona un prestador...</option>
                    {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto} ({p.nombre})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Servicio *</label>
                    <select 
                      value={form.tipo_servicio} 
                      onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Zona (Opcional)</label>
                    <input 
                      value={form.zona} 
                      onChange={(e) => setForm({ ...form, zona: e.target.value })}
                      placeholder="Vacío = Toda la cobertura"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Costo de Servicio ($) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                      <input 
                        type="number" 
                        value={form.costo_servicio} 
                        onChange={(e) => setForm({ ...form, costo_servicio: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-slate-800" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Costo KM ($) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                      <input 
                        type="number" 
                        value={form.costo_km} 
                        onChange={(e) => setForm({ ...form, costo_km: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vigencia Desde *</label>
                    <input 
                      type="date" 
                      value={form.vigencia_desde} 
                      onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vigencia Hasta</label>
                    <input 
                      type="date" 
                      value={form.vigencia_hasta} 
                      onChange={(e) => setForm({ ...form, vigencia_hasta: e.target.value })}
                      placeholder="Vacío = Permanente"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                onClick={() => { setForm(EMPTY); setEditId(null); setShowModal(false); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-transparent px-4 py-2.5 rounded-lg hover:bg-slate-200/40 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white border border-indigo-600 px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Check className="w-4 h-4" />
                {editId ? "Guardar Cambios" : "Guardar Tarifa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
