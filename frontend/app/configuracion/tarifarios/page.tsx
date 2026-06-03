"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatMonto, exportToCSV } from "@/lib/utils";

interface Prestador { id: number; nombre_corto: string; }
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

const TIPOS = ["correctivo", "preventivo", "instalacion_desinstalacion", "pre_correctivo", "guardia", "sistemas"];
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
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
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
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
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
          msg: `${result.prestador} (${result.vigencia_desde}): ${result.creados} creados, ${result.omitidos} ya existían${result.errores ? `, ${result.errores} errores` : ""}.`,
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Tarifarios</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDescargarPlantilla}
            className="text-xs border border-gray-400 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
          >
            ↓ Plantilla .xlsx
          </button>
          <label className={`text-xs px-3 py-1.5 rounded cursor-pointer border font-medium ${
            importando
              ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
              : "bg-green-600 text-white border-green-600 hover:bg-green-700"
          }`}>
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
          <button onClick={handleExport}
            className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200">
            Exportar CSV
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`text-sm px-3 py-2 rounded border ${
          importStatus.type === "ok"  ? "bg-green-50 border-green-200 text-green-800" :
          importStatus.type === "err" ? "bg-red-50 border-red-200 text-red-800" :
                                        "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          {importStatus.msg}
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{editId ? "Editar" : "Nuevo tarifario"}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prestador *</label>
            <select value={form.prestador_id} onChange={(e) => setForm({ ...form, prestador_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Seleccioná...</option>
              {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de servicio *</label>
            <select value={form.tipo_servicio} onChange={(e) => setForm({ ...form, tipo_servicio: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zona (opcional)</label>
            <input value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })}
              placeholder="Vacío = toda la cobertura"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo servicio ($) *</label>
            <input type="number" value={form.costo_servicio} onChange={(e) => setForm({ ...form, costo_servicio: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo km ($) *</label>
            <input type="number" value={form.costo_km} onChange={(e) => setForm({ ...form, costo_km: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vigencia desde *</label>
            <input type="date" value={form.vigencia_desde} onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vigencia hasta (vacío = vigente)</label>
            <input type="date" value={form.vigencia_hasta} onChange={(e) => setForm({ ...form, vigencia_hasta: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
            {editId ? "Guardar" : "Crear"}
          </button>
          {editId && <button onClick={() => { setForm(EMPTY); setEditId(null); }} className="text-sm text-gray-500">Cancelar</button>}
        </div>
      </div>

      {/* Filtro + tabla */}
      <div className="space-y-2">
        <select value={filtroP} onChange={(e) => setFiltroP(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none">
          <option value="">Todos los prestadores</option>
          {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto}</option>)}
        </select>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                <th className="px-4 py-3 text-left">PST</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Zona</th>
                <th className="px-4 py-3 text-right">Costo Serv.</th>
                <th className="px-4 py-3 text-right">Costo KM</th>
                <th className="px-4 py-3 text-left">Vigencia desde</th>
                <th className="px-4 py-3 text-left">Hasta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((t) => {
                const pst = prestadores.find((p) => p.id === t.prestador_id);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono font-semibold text-xs text-gray-700">{pst?.nombre_corto}</td>
                    <td className="px-4 py-2.5 text-gray-700 capitalize">{t.tipo_servicio.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.zona || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatMonto(t.costo_servicio)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatMonto(t.costo_km)}/km</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.vigencia_desde}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.vigencia_hasta || "vigente"}</td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      <button onClick={() => handleEdit(t)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={async () => { await api.deleteTarifario(t.id); load(); }} className="text-xs text-red-400 hover:text-red-600">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
