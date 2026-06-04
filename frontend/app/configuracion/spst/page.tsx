"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV, parseCSV, downloadCSVTemplate } from "@/lib/utils";

interface Prestador { id: number; nombre_corto: string; }
interface SPST {
  id: number;
  prestador_id: number;
  nombre: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  zona: string;
  activo: boolean;
}

const EMPTY = { prestador_id: "", nombre: "", domicilio: "", localidad: "", provincia: "", zona: "", activo: true };

export default function SPSTPage() {
  const [items, setItems] = useState<SPST[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [filtroP, setFiltroP] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.getSPSTs(filtroP ? Number(filtroP) : undefined).then(setItems);
  useEffect(() => { api.getPrestadores().then(setPrestadores); }, []);
  useEffect(() => { load(); }, [filtroP]);

  const handleSave = async () => {
    setError("");
    const payload = { ...form, prestador_id: Number(form.prestador_id) };
    try {
      if (editId) await api.updateSPST(editId, payload);
      else await api.createSPST(payload);
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const handleEdit = (s: SPST) => {
    setEditId(s.id);
    setForm({
      prestador_id: String(s.prestador_id),
      nombre: s.nombre,
      domicilio: s.domicilio || "",
      localidad: s.localidad || "",
      provincia: s.provincia || "",
      zona: s.zona || "",
      activo: s.activo,
    });
  };

  const handleExport = () => {
    const allSpsts = items;
    exportToCSV(
      allSpsts.map((s) => {
        const pst = prestadores.find((p) => p.id === s.prestador_id);
        return {
          prestador_clave: pst?.nombre_corto ?? "",
          nombre: s.nombre,
          localidad: s.localidad || "",
          provincia: s.provincia || "",
          zona: s.zona || "",
          domicilio: s.domicilio || "",
        };
      }),
      "spsts.csv"
    );
  };

  const downloadTemplate = () => {
    const content = `sep=,
# ==============================================================================
# PLANTILLA DE IMPORTACION DE SUB-PRESTADORES (SPST)
# ==============================================================================
# Instrucciones de llenado:
# - prestador_clave: Clave corta del prestador padre (debe existir previamente, ej. PENTACOM).
# - nombre: Nombre descriptivo del sub-prestador (ej. PST Mar del Plata - Jose Perez).
# - localidad: Localidad base (ej. Mar del Plata).
# - provincia: Provincia base (ej. Buenos Aires).
# - zona: Zonas de cobertura separadas por coma (ej. Mar del Plata, Miramar, Necochea).
# - domicilio: Domicilio operativo o fiscal (ej. Av. Colon 1234).
#
# Nota: Puede borrar estas lineas de ayuda o dejarlas. El sistema las omitira al importar.
# ==============================================================================
prestador_clave,nombre,localidad,provincia,zona,domicilio
SUPERNOVA,PST Rosario Centro,Rosario,Santa Fe,Rosario,Pellegrini 1500
PENTACOM,PST Cordoba Capital,Cordoba,Cordoba,Cordoba,Colon 200
`;
    downloadCSVTemplate(content, "plantilla_spsts.csv");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Leyendo archivo...");
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setImportStatus("Archivo vacío o sin encabezados."); return; }
    const pstMap = Object.fromEntries(prestadores.map((p) => [p.nombre_corto.toUpperCase(), p.id]));
    let ok = 0; let err = 0;
    for (const row of rows) {
      const clave = row.prestador_clave?.trim().toUpperCase();
      const nombre = row.nombre?.trim();
      const prestador_id = pstMap[clave];
      if (!nombre || !prestador_id) { err++; continue; }
      try {
        await api.createSPST({
          prestador_id,
          nombre,
          localidad: row.localidad || "",
          provincia: row.provincia || "",
          zona: row.zona || "",
          domicilio: row.domicilio || "",
          activo: true,
        });
        ok++;
      } catch { err++; }
    }
    setImportStatus(`Importación completa: ${ok} creados, ${err} errores.`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">SPSTs</h2>
          <p className="text-sm text-gray-500">Sub-prestadores de servicio técnico — técnicos y zonas de cobertura</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 font-medium transition-colors">
            Descargar planilla CSV
          </button>
          <label className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 cursor-pointer font-medium transition-colors">
            Cargar Planilla CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="text-sm px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
          {importStatus}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{editId ? "Editar SPST" : "Nuevo SPST"}</h3>
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
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="PST Córdoba - Pentacom S.A."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Domicilio base</label>
            <input value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Localidad</label>
            <input value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provincia</label>
            <input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zona</label>
            <input value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })}
              placeholder="Córdoba Capital, Río Cuarto..."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          Activo
        </label>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
            {editId ? "Guardar" : "Crear"}
          </button>
          {editId && <button onClick={() => { setForm(EMPTY); setEditId(null); }} className="text-sm text-gray-500">Cancelar</button>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={filtroP} onChange={(e) => setFiltroP(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">Todos los PSTs</option>
          {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nombre_corto}</option>)}
        </select>
        <span className="text-xs text-gray-400">{items.length} SPSTs</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3 text-left">PST</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Localidad</th>
              <th className="px-4 py-3 text-left">Zona</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((s) => {
              const pst = prestadores.find((p) => p.id === s.prestador_id);
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-xs text-gray-600">{pst?.nombre_corto}</td>
                  <td className="px-4 py-2.5 text-gray-800">{s.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.localidad || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{s.zona || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <button onClick={() => handleEdit(s)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={async () => { await api.deleteSPST(s.id); load(); }} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
