"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { clsEstadoLiquidacion, formatMonto, formatFecha } from "@/lib/utils";

interface Stats {
  total_liquidaciones: number;
  liquidaciones_pendientes: number;
  total_incidentes: number;
  total_importe: number;
  recientes: {
    id: number;
    prestador: string;
    periodo: string;
    tipo: string;
    estado: string;
    total_incidentes: number;
    total_importe: number;
    fecha: string;
  }[];
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-lg border p-5 ${color}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setError("No se pudo conectar al backend. Verificá que esté corriendo en puerto 8002."));
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6 text-gray-500 text-sm">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500">Estado actual del proceso de liquidaciones</p>
        </div>
        <Link
          href="/liquidaciones/nueva"
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Importar liquidación
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Liquidaciones pendientes"
          value={stats.liquidaciones_pendientes}
          sub={`de ${stats.total_liquidaciones} total`}
          color="bg-yellow-50 border-yellow-200 text-yellow-900"
        />
        <StatCard
          label="Total importadas"
          value={stats.total_liquidaciones}
          color="bg-brand-50 border-brand-200 text-brand-900"
        />
        <StatCard
          label="Total incidentes"
          value={stats.total_incidentes || 0}
          color="bg-emerald-50 border-emerald-200 text-emerald-900"
        />
        <StatCard
          label="Total facturado"
          value={formatMonto(stats.total_importe || 0)}
          color="bg-gray-100 border-gray-200 text-gray-800"
        />
      </div>

      {/* Recientes */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Últimas liquidaciones</h3>
          <Link href="/liquidaciones" className="text-xs text-brand-600 hover:underline">Ver todas</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Prestador</th>
                <th className="px-4 py-2 text-left">Período</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Incidentes</th>
                <th className="px-4 py-2 text-right">Importe</th>
                <th className="px-4 py-2 text-right">Fecha de Carga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs">
                    Aún no hay liquidaciones importadas.{" "}
                    <Link href="/liquidaciones/nueva" className="text-brand-600 hover:underline">Importar primera liquidación</Link>
                  </td>
                </tr>
              )}
              {stats.recientes.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2.5">
                    <Link href={`/liquidaciones/${l.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                      {l.prestador}
                    </Link>
                    {l.tipo !== "regular" && (
                      <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {l.tipo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{l.periodo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clsEstadoLiquidacion(l.estado)}`}>
                      {l.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                    {l.total_incidentes}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{formatMonto(l.total_importe)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{formatFecha(l.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
