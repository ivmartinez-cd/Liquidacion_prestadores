"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV } from "@/lib/utils";

interface Prestador { id: number; nombre_corto: string; }
interface SPST { id: number; nombre: string; prestador_id: number; }
interface TablaKM {
  id: number;
  prestador_id: number;
  spst_id: number | null;
  empresa_nombre: string;
  sucursal_nombre: string;
  nro_serie: string | null;
  kms_recorrido: number;
  umbral_viatico: number;
  aplica_viatico: boolean;
  kms_a_facturar: number;
  url_maps: string | null;
}

const EMPTY = {
  prestador_id: "", spst_id: "", empresa_nombre: "", sucursal_nombre: "",
  nro_serie: "", kms_recorrido: "", umbral_viatico: "30", url_maps: "",
};

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function TablaKMPage() {
  const [items, setItems] = useState<TablaKM[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [spsts, setSpsts] = useState<SPST[]>([]);
  const [filtroP, setFiltroP] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const load = () => api.getTablaKM(filtroP ? Number(filtroP) : undefined, busqueda || undefined).then(setItems);

  useEffect(() => {
    api.getPrestadores().then(setPrestadores);
    api.getSPSTs().then(setSpsts);
  }, []);

  useEffect(() => { load(); }, [filtroP, busqueda]);

  const spstsFiltrados = spsts.filter((s) => !form.prestador_id || s.prestador_id === Number(form.prestador_id));

  const handleSave = async () => {
    setError("");
    const payload = {
      prestador_id: Number(form.prestador_id),
      spst_id: form.spst_id ? Number(form.spst_id) : null,
      empresa_nombre: form.empresa_nombre,
      sucursal_nombre: form.sucursal_nombre,
      nro_serie: form.nro_serie || null,
      kms_recorrido: Number(form.kms_recorrido),
      umbral_viatico: Number(form.umbral_viatico),
      url_maps: form.url_maps || null,
    };
    try {
      if (editId) await api.updateTablaKM(editId, payload);
      else await api.createTablaKM(payload);
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const handleEdit = (t: TablaKM) => {
    setEditId(t.id);
    setForm({
      prestador_id: String(t.prestador_id),
      spst_id: t.spst_id ? String(t.spst_id) : "",
      empresa_nombre: t.empresa_nombre,
      sucursal_nombre: t.sucursal_nombre,
      nro_serie: t.nro_serie || "",
      kms_recorrido: String(t.kms_recorrido),
      umbral_viatico: String(t.umbral_viatico),
      url_maps: t.url_maps || "",
    });
  };

  const handleExport = () => {
    exportToCSV(
      items.map((t) => {
        const pst = prestadores.find((p) => p.id === t.prestador_id);
        const spst = spsts.find((s) => s.id === t.spst_id);
        return {
          prestador: pst?.nombre_corto ?? "",
          spst: spst?.nombre ?? "",
          empresa: t.empresa_nombre,
          sucursal: t.sucursal_nombre,
          kms_recorrido: t.kms_recorrido,
          aplica_viatico: t.aplica_viatico ? "si" : "no",
          url_maps: t.url_maps ?? "",
        };
      }),
      filtroP
        ? `tabla_km_${prestadores.find((p) => String(p.id) === filtroP)?.nombre_corto ?? filtroP}.csv`
        : "tabla_km_todos.csv"
    );
  };

  const handleDescargarPlantilla = () => {
    triggerDownload(api.plantillaTablaKMUrl, "plantilla_tabla_km.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setImportStatus({ msg: `Procesando ${file.name}...`, type: "info" });
    try {
      const result = await api.importarExcelTablaKM(file);
      if (result.detail) {
        setImportStatus({ msg: result.detail, type: "err" });
      } else {
        setImportStatus({
          msg: `${result.prestador}: ${result.importadas} importadas, ${result.omitidas} ya existían${result.errores ? `, ${result.errores} errores` : ""}.`,
          type: result.importadas > 0 ? "ok" : "info",
        });
        load();
        api.getSPSTs().then(setSpsts);
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tabla KM</h2>
          <p className="text-sm text-gray-500">
            KMs preacordados por par Empresa + Sucursal. Fuente de verdad para validación de kilómetros.
          </p>
        </div>
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
          importStatus.type === "ok"   ? "bg-green-50 border-green-200 text-green-800" :
          importStatus.type === "err"  ? "bg-red-50 border-red-200 text-red-800" :
                                         "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          {importStatus.msg}
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{editId ? "Editar entrada" : "Nueva entrada"}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prestador *</label>
            <select value={form.prestador_id}
              onChange={(e) => setForm({ ...form, prestador_id: e.target.value, spst_id: "" })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Seleccioná...</option>
              {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">SPST (técnico/zona)</label>
            <select value={form.spst_id} onChange={(e) => setForm({ ...form, spst_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Sin asignar</option>
              {spstsFiltrados.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Empresa (cliente) *</label>
            <input value={form.empresa_nombre} onChange={(e) => setForm({ ...form, empresa_nombre: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sucursal *</label>
            <input value={form.sucursal_nombre} onChange={(e) => setForm({ ...form, sucursal_nombre: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nro. Serie</label>
            <input value={form.nro_serie} onChange={(e) => setForm({ ...form, nro_serie: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">KMs recorrido *</label>
            <input type="number" step="0.1" value={form.kms_recorrido}
              onChange={(e) => setForm({ ...form, kms_recorrido: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Umbral viático (km)</label>
            <input type="number" step="1" value={form.umbral_viatico}
              onChange={(e) => setForm({ ...form, umbral_viatico: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">URL Google Maps</label>
            <input value={form.url_maps} onChange={(e) => setForm({ ...form, url_maps: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
            {editId ? "Guardar" : "Agregar"}
          </button>
          {editId && <button onClick={() => { setForm(EMPTY); setEditId(null); }} className="text-sm text-gray-500">Cancelar</button>}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <select value={filtroP} onChange={(e) => setFiltroP(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">Todos los PSTs</option>
          {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto}</option>)}
        </select>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por empresa..."
          className="text-sm border border-gray-300 rounded px-3 py-1.5 flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <span className="text-xs text-gray-400 self-center">{items.length} entradas</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                <th className="px-4 py-3 text-left">PST</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Sucursal</th>
                <th className="px-4 py-3 text-right">KMs</th>
                <th className="px-4 py-3 text-center">Viático</th>
                <th className="px-4 py-3 text-right">KMs fact.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((t) => {
                const pst = prestadores.find((p) => p.id === t.prestador_id);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs font-mono font-semibold text-gray-600">{pst?.nombre_corto}</td>
                    <td className="px-4 py-2 text-gray-800">{t.empresa_nombre}</td>
                    <td className="px-4 py-2 text-gray-600">{t.sucursal_nombre}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{t.kms_recorrido}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.aplica_viatico ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                        {t.aplica_viatico ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">{t.kms_a_facturar}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => handleEdit(t)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={async () => { await api.deleteTablaKM(t.id); load(); }} className="text-xs text-red-400 hover:text-red-600">×</button>
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
