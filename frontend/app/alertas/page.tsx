"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { clsRiesgo, labelRiesgo, clsEstadoAlerta, formatFecha, TIPO_ALERTA_LABEL } from "@/lib/utils";

interface Alerta {
  id: number;
  incidente_id: number;
  liquidacion_id: number;
  tipo_alerta: string;
  descripcion: string;
  riesgo: number;
  estado: string;
  fecha_generacion: string;
}

interface Prestador {
  id: number;
  nombre_corto: string;
}

function AlertasBandeja() {
  const sp = useSearchParams();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState({
    liquidacion_id: sp.get("liquidacion_id") || "",
    prestador_id: sp.get("prestador_id") || "",
    tipo_alerta: sp.get("tipo_alerta") || "",
    estado: sp.get("estado") || "pendiente",
  });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filtros.liquidacion_id) params.liquidacion_id = filtros.liquidacion_id;
    if (filtros.prestador_id) params.prestador_id = filtros.prestador_id;
    if (filtros.tipo_alerta) params.tipo_alerta = filtros.tipo_alerta;
    if (filtros.estado) params.estado = filtros.estado;
    api.getAlertas(params).then(setAlertas).finally(() => setLoading(false));
  };

  useEffect(() => { api.getPrestadores().then(setPrestadores); }, []);
  useEffect(load, [filtros]);

  const handleDescartar = async (id: number) => {
    await api.descartarAlerta(id);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Bandeja de Alertas</h2>
        <p className="text-sm text-gray-500">Ordenadas por riesgo descendente</p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3">
        <select
          value={filtros.prestador_id}
          onChange={(e) => setFiltros({ ...filtros, prestador_id: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los PSTs</option>
          {prestadores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre_corto}</option>
          ))}
        </select>

        <select
          value={filtros.tipo_alerta}
          onChange={(e) => setFiltros({ ...filtros, tipo_alerta: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_ALERTA_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{k} — {v}</option>
          ))}
        </select>

        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_revision">En revisión</option>
          <option value="resuelta">Resuelta</option>
          <option value="descartada">Descartada</option>
        </select>

        {filtros.liquidacion_id && (
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            Liquidación #{filtros.liquidacion_id}
            <button onClick={() => setFiltros({ ...filtros, liquidacion_id: "" })} className="ml-1 hover:text-blue-800">×</button>
          </div>
        )}

        <span className="text-xs text-gray-400 self-center ml-auto">
          {loading ? "Cargando..." : `${alertas.length} alerta(s)`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3 text-left">Riesgo</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!loading && alertas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No hay alertas con los filtros seleccionados.
                </td>
              </tr>
            )}
            {alertas.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded border font-bold ${clsRiesgo(a.riesgo)}`}>
                    {Math.round(a.riesgo)} — {labelRiesgo(a.riesgo)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-600">{a.tipo_alerta}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs">
                  <Link href={`/alertas/${a.id}`} className="hover:text-blue-600 hover:underline line-clamp-2">
                    {a.descripcion}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${clsEstadoAlerta(a.estado)}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-400">{formatFecha(a.fecha_generacion)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/alertas/${a.id}`} className="text-xs text-blue-600 hover:underline">
                      Ver
                    </Link>
                    {a.estado === "pendiente" && (
                      <button
                        onClick={() => handleDescartar(a.id)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Descartar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AlertasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando...</div>}>
      <AlertasBandeja />
    </Suspense>
  );
}
