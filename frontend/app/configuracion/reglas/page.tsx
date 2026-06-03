"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Regla {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  riesgo_base: number;
  configuracion: Record<string, unknown>;
}

export default function ReglasPage() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{ riesgo_base: string; activa: boolean; configuracion: string }>({
    riesgo_base: "", activa: true, configuracion: "{}",
  });
  const [msg, setMsg] = useState("");

  const load = () => api.getReglas().then(setReglas);
  useEffect(() => { load(); }, []);

  const handleEdit = (r: Regla) => {
    setEditId(r.codigo);
    setForm({
      riesgo_base: String(r.riesgo_base),
      activa: r.activa,
      configuracion: JSON.stringify(r.configuracion, null, 2),
    });
  };

  const handleSave = async () => {
    if (!editId) return;
    try {
      const cfg = JSON.parse(form.configuracion);
      await api.updateRegla(editId, {
        riesgo_base: Number(form.riesgo_base),
        activa: form.activa,
        configuracion: cfg,
      });
      setMsg("Guardado.");
      setEditId(null);
      load();
    } catch {
      setMsg("Error al guardar. Verificá que el JSON de configuración sea válido.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Reglas de Alerta</h2>
        <p className="text-sm text-gray-500">
          Configurá el puntaje de riesgo y umbrales de cada regla. Las reglas inactivas no se evalúan.
        </p>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded p-3">{msg}</div>}

      <div className="space-y-3">
        {reglas.map((r) => (
          <div key={r.codigo} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-sm text-gray-700">{r.codigo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.activa ? "Activa" : "Inactiva"}
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    Riesgo: {r.riesgo_base}
                  </span>
                </div>
                <p className="font-medium text-gray-800 text-sm">{r.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.descripcion}</p>
                {Object.keys(r.configuracion).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Config: {JSON.stringify(r.configuracion)}
                  </p>
                )}
              </div>
              <button onClick={() => handleEdit(r)} className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-4">
                Editar
              </button>
            </div>

            {editId === r.codigo && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Puntaje de riesgo base</label>
                    <input type="number" value={form.riesgo_base}
                      onChange={(e) => setForm({ ...form, riesgo_base: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={form.activa}
                        onChange={(e) => setForm({ ...form, activa: e.target.checked })} />
                      Regla activa
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Configuración (JSON)</label>
                  <textarea value={form.configuracion}
                    onChange={(e) => setForm({ ...form, configuracion: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ejemplo para ALT003: {"{"}"ventana_dias": 30{"}"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
                    Guardar
                  </button>
                  <button onClick={() => setEditId(null)} className="text-sm text-gray-500">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
