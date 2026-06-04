"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV, parseCSV, downloadCSVTemplate } from "@/lib/utils";

interface Prestador {
  id: number;
  nombre: string;
  nombre_corto: string;
  cuit: string;
  region: string;
  activo: boolean;
}

const EMPTY = { nombre: "", nombre_corto: "", cuit: "", region: "", activo: true };
const TEMPLATE_COLS = ["nombre", "nombre_corto", "cuit", "region"];

export default function PrestadoresPage() {
  const [items, setItems] = useState<Prestador[]>([]);
  const [form, setForm] = useState<Omit<Prestador, "id">>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [xlsxStatus, setXlsxStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const load = () => api.getPrestadores().then(setItems);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setError("");
    try {
      if (editId) await api.updatePrestador(editId, form);
      else await api.createPrestador(form);
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const handleEdit = (p: Prestador) => {
    setEditId(p.id);
    setForm({ nombre: p.nombre, nombre_corto: p.nombre_corto, cuit: p.cuit || "", region: p.region || "", activo: p.activo });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este prestador?")) return;
    await api.deletePrestador(id);
    load();
  };

  const handleExport = () => {
    exportToCSV(
      items.map((p) => ({ nombre: p.nombre, nombre_corto: p.nombre_corto, cuit: p.cuit || "", region: p.region || "", activo: p.activo ? "si" : "no" })),
      "prestadores.csv"
    );
  };

  const downloadTemplate = () => {
    const content = `sep=,
# ==============================================================================
# PLANTILLA DE IMPORTACION DE PRESTADORES
# ==============================================================================
# Instrucciones de llenado:
# - nombre: Razon social o nombre completo del prestador (ej. Supernova Servicios S.R.L.).
# - nombre_corto: Identificador clave (letras mayusculas sin espacios, ej. SUPERNOVA).
# - cuit: CUIT de la empresa sin guiones ni espacios (ej. 30712345678).
# - region: Provincia o zona de operacion principal (ej. Santa Fe, Cordoba, Buenos Aires).
#
# Nota: Puede borrar estas lineas de ayuda o dejarlas. El sistema las omitira al importar.
# ==============================================================================
nombre,nombre_corto,cuit,region
Supernova Servicios S.R.L.,SUPERNOVA,30711122238,Rosario
Pentacom S.A.,PENTACOM,30655544439,Cordoba
`;
    downloadCSVTemplate(content, "plantilla_prestadores.csv");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Leyendo archivo...");
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setImportStatus("El archivo está vacío o sin encabezados."); return; }
    let ok = 0; let err = 0;
    for (const row of rows) {
      const nombre = row.nombre?.trim();
      const nombre_corto = row.nombre_corto?.trim().toUpperCase();
      if (!nombre || !nombre_corto) { err++; continue; }
      try {
        await api.createPrestador({ nombre, nombre_corto, cuit: row.cuit || "", region: row.region || "", activo: true });
        ok++;
      } catch { err++; }
    }
    setImportStatus(`Importación completa: ${ok} creados, ${err} errores.`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImportXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsxStatus(`Procesando ${file.name}...`);
    try {
      const result = await api.importarExcelPrestador(file);
      if (result.detail) {
        setXlsxStatus(`Error: ${result.detail}`);
      } else {
        setXlsxStatus(
          `${result.nombre_corto} — Prestador: ${result.prestador_creado ? "creado" : "existente"} ` +
          `| SPSTs: ${result.spsts_creados} nuevos ` +
          `| Tarifarios: ${result.tarifarios_creados} nuevos ` +
          `| Tabla KM: ${result.tabla_km?.importadas ?? 0} filas (${result.tabla_km?.omitidas ?? 0} omitidas)`
        );
        load();
      }
    } catch (err) {
      setXlsxStatus(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    }
    if (xlsxRef.current) xlsxRef.current.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Prestadores</h2>
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

      {xlsxStatus && (
        <div className="text-sm px-3 py-2 bg-green-50 border border-green-200 rounded text-green-800">
          {xlsxStatus}
        </div>
      )}
      {importStatus && (
        <div className="text-sm px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
          {importStatus}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{editId ? "Editar prestador" : "Nuevo prestador"}</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre corto (clave) *</label>
            <input value={form.nombre_corto} onChange={(e) => setForm({ ...form, nombre_corto: e.target.value.toUpperCase() })}
              placeholder="PENTACOM"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CUIT</label>
            <input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Región / Plaza</label>
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Córdoba, Rosario..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="activo" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          <label htmlFor="activo" className="text-sm text-gray-600">Activo</label>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
            {editId ? "Guardar cambios" : "Crear prestador"}
          </button>
          {editId && (
            <button onClick={() => { setForm(EMPTY); setEditId(null); }} className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3 text-left">Clave</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">CUIT</th>
              <th className="px-4 py-3 text-left">Región</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{p.nombre_corto}</td>
                <td className="px-4 py-2.5 text-gray-700">{p.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.cuit || "-"}</td>
                <td className="px-4 py-2.5 text-gray-500">{p.region || "-"}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-3">
                  <button onClick={() => handleEdit(p)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
