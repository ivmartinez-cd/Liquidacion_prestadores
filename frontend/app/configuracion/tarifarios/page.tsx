"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV } from "@/lib/utils";
import {
  Plus,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  X,
} from "lucide-react";

import { Prestador, Tarifario, GroupedService } from "@/components/tarifarios/types";
import { PrestadorTarifasCard } from "@/components/tarifarios/PrestadorTarifasCard";
import { TarifarioModal, TarifarioForm } from "@/components/tarifarios/TarifarioModal";

const EMPTY: TarifarioForm = {
  prestador_id: "",
  tipo_servicio: "correctivo",
  zona: "",
  costo_servicio: "",
  costo_km: "",
  vigencia_desde: "",
  vigencia_hasta: ""
};

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
  const [form, setForm] = useState<TarifarioForm>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const xlsxRef = useRef<HTMLInputElement>(null);

  // Load available zones when prestador_id changes
  useEffect(() => {
    if (!form.prestador_id) {
      setAvailableZones([]);
      return;
    }
    api.getSPSTs(Number(form.prestador_id))
      .then((data: any) => {
        if (Array.isArray(data)) {
          const zones = Array.from(new Set(data.map((s: any) => s.zona).filter(Boolean))) as string[];
          setAvailableZones(zones.sort());
        }
      })
      .catch(() => {
        setAvailableZones([]);
      });
  }, [form.prestador_id]);

  const load = () => api.getTarifarios(filtroP ? Number(filtroP) : undefined).then(setItems);

  useEffect(() => {
    api.getPrestadores().then(setPrestadores);
  }, []);

  useEffect(() => {
    load();
  }, [filtroP]);

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
          .map((p) => (
            <PrestadorTarifasCard
              key={p.id}
              prestador={p}
              items={items.filter((t) => t.prestador_id === p.id)}
              onAddTarifa={() => {
                setForm({
                  ...EMPTY,
                  prestador_id: String(p.id),
                  vigencia_desde: new Date().toISOString().split("T")[0]
                });
                setEditId(null);
                setShowModal(true);
              }}
              onUpdateActive={(service) => handleUpdateActive(service, p.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
      </div>

      <TarifarioModal
        isOpen={showModal}
        editId={editId}
        form={form}
        error={error}
        prestadores={prestadores}
        availableZones={availableZones}
        onClose={() => { setForm(EMPTY); setEditId(null); setShowModal(false); }}
        onChangeForm={setForm}
        onSave={handleSave}
      />
    </div>
  );
}
