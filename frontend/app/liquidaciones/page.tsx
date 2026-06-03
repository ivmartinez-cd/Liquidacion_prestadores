"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { clsEstadoLiquidacion, formatMonto, formatFecha } from "@/lib/utils";

interface Liquidacion {
  id: number;
  prestador_id: number;
  prestador_nombre?: string;
  numero_liquidacion: string;
  periodo: string;
  tipo_liquidacion: string;
  nombre_archivo: string;
  fecha_importacion: string;
  estado: string;
  total_incidentes: number;
  total_alertas: number;
  total_importe: number;
}

export default function LiquidacionesPage() {
  const [items, setItems] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getLiquidaciones().then(setItems).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta liquidación y todos sus datos?")) return;
    await api.deleteLiquidacion(id);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Liquidaciones</h2>
          <p className="text-sm text-gray-500">Historial de importaciones</p>
        </div>
        <Link
          href="/liquidaciones/nueva"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Importar
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Prestador</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Incidentes</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No hay liquidaciones importadas aún.{" "}
                  <Link href="/liquidaciones/nueva" className="text-blue-600 hover:underline">
                    Importar primera
                  </Link>
                </td>
              </tr>
            )}
            {items.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/liquidaciones/${l.id}`} className="text-blue-600 hover:underline font-medium">
                    {l.nombre_archivo || l.numero_liquidacion || `#${l.id}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{l.prestador_nombre || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{l.periodo}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {l.tipo_liquidacion}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clsEstadoLiquidacion(l.estado)}`}>
                    {l.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{l.total_incidentes}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatMonto(l.total_importe)}</td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatFecha(l.fecha_importacion)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
