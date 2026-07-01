"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { clsEstadoLiquidacion, formatMonto } from "@/lib/utils";

interface Incidente {
  id: number;
  numero_incidente: string;
  tipo: string;
  empresa_nombre: string;
  sucursal_nombre: string;
  fecha_cierre?: string | null;
  costo_servicio_cobrado: number;
  cant_km_cobrado: number;
  costo_km_cobrado: number;
  costo_total_cobrado: number;
  costo_servicio_esperado: number | null;
  cant_km_esperado: number | null;
  costo_km_esperado: number | null;
  estado_validacion: string;
  localidad_cliente?: string | null;
  spst_id?: number | null;
  url_maps?: string | null;
}

interface Liquidacion {
  id: number;
  prestador_id: number;
  numero_liquidacion: string;
  periodo: string;
  tipo_liquidacion: string;
  nombre_archivo: string;
  estado: string;
  total_incidentes: number;
  total_importe: number;
  incidentes: Incidente[];
}

export default function LiquidacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [liq, setLiq] = useState<Liquidacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalizing, setReanalizing] = useState(false);

  const load = () => {
    setLoading(true);
    api.getLiquidacion(Number(id)).then(setLiq).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleReanalize = async () => {
    setReanalizing(true);
    await api.reanalizar(Number(id));
    load();
    setReanalizing(false);
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando...</div>;
  if (!liq) return <div className="p-6 text-sm text-red-500">Liquidación no encontrada.</div>;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/liquidaciones" className="text-xs text-brand-600 hover:underline mb-1 block">← Volver</Link>
          <h2 className="text-xl font-bold text-gray-800">{liq.nombre_archivo || `Liquidación #${liq.id}`}</h2>
          <div className="flex items-center gap-2 mt-1">
            <select
              value={liq.estado}
              onChange={async (e) => {
                const newEstado = e.target.value;
                try {
                  await api.cambiarEstado(liq.id, newEstado);
                  setLiq({ ...liq, estado: newEstado });
                } catch (err) {
                  alert("Error al actualizar el estado de la liquidación");
                }
              }}
              className={`text-xs px-2 py-0.5 rounded-full font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${clsEstadoLiquidacion(liq.estado)}`}
            >
              <option value="abierta" className="bg-white text-gray-800 font-medium">Abierta</option>
              <option value="preliquidada" className="bg-white text-gray-800 font-medium">Preliquidada</option>
              <option value="recibida" className="bg-white text-gray-800 font-medium">Recibida</option>
              <option value="observada" className="bg-white text-gray-800 font-medium">Observada</option>
              <option value="aprobada" className="bg-white text-gray-800 font-medium">Aprobada</option>
              <option value="cerrada" className="bg-white text-gray-800 font-medium">Cerrada</option>
              {liq.estado === "pendiente" && (
                <option value="pendiente" className="bg-white text-gray-800 font-medium">Pendiente</option>
              )}
            </select>
            <span className="text-xs text-gray-500">Período {liq.periodo}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{liq.tipo_liquidacion}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReanalize}
            disabled={reanalizing}
            className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {reanalizing ? "Analizando..." : "Re-analizar"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{liq.total_incidentes}</p>
          <p className="text-xs text-gray-500">Incidentes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-gray-800">{formatMonto(liq.total_importe)}</p>
          <p className="text-xs text-gray-500">Total cobrado</p>
        </div>
      </div>

      {/* Tablas de incidentes separadas */}
      <IncidentTable
        titulo="Correctivos, Pre-correctivos e Instalaciones"
        incidentes={liq.incidentes.filter(i => i.tipo.toLowerCase() !== "preventivo")}
        liqId={liq.id}
      />

      <IncidentTable
        titulo="Preventivos"
        incidentes={liq.incidentes.filter(i => i.tipo.toLowerCase() === "preventivo")}
        liqId={liq.id}
      />

      {/* Modelo de Facturación */}
      <ModeloFacturacion incidentes={liq.incidentes} />
    </div>
  );
}

const IncidentTable = ({
  titulo,
  incidentes,
  liqId,
}: {
  titulo: string;
  incidentes: Incidente[];
  liqId: number;
}) => {
  const [selectedDate, setSelectedDate] = useState<string>("");

  if (incidentes.length === 0) return null;

  // Extract unique sorted dates for the filter dropdown
  const dates = Array.from(
    new Set(incidentes.map((i) => i.fecha_cierre).filter(Boolean))
  ).sort() as string[];

  // Filter incidentes by selected closure date
  const filteredIncidentes = selectedDate
    ? incidentes.filter((i) => i.fecha_cierre === selectedDate)
    : incidentes;

  const sortedIncidentes = [...filteredIncidentes].sort((a, b) => {
    const dateA = a.fecha_cierre || "";
    const dateB = b.fecha_cierre || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.empresa_nombre || "").localeCompare(b.empresa_nombre || "");
  });

  const totalCostoServ = filteredIncidentes.reduce((acc, inc) => acc + (inc.costo_servicio_cobrado || 0), 0);
  const totalKms = filteredIncidentes.reduce((acc, inc) => acc + (inc.cant_km_cobrado || 0), 0);
  const totalGeneral = filteredIncidentes.reduce((acc, inc) => acc + (inc.costo_total_cobrado || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-gray-700">{titulo} ({filteredIncidentes.length})</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtrar por fecha de cierre:</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas las fechas</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-2 text-left">Incidente</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-left">Sucursal</th>
              <th className="px-4 py-2 text-left">Fecha Cierre</th>
              <th className="px-4 py-2 text-right">Costo Serv.</th>
              <th className="px-4 py-2 text-right">KMs</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(() => {
              const rows: React.ReactNode[] = [];
              let lastDate: string | null | undefined = null;

              // Pre-compute locality / SPST groups per day to highlight shared-route incidents
              const sharedGroupCount: Record<string, number> = {};
              sortedIncidentes.forEach((inc) => {
                if (inc.fecha_cierre) {
                  if (inc.spst_id) {
                    const key = `${inc.fecha_cierre}|spst-${inc.spst_id}`;
                    sharedGroupCount[key] = (sharedGroupCount[key] || 0) + 1;
                  } else if (inc.localidad_cliente) {
                    const key = `${inc.fecha_cierre}|loc-${inc.localidad_cliente}`;
                    sharedGroupCount[key] = (sharedGroupCount[key] || 0) + 1;
                  }
                }
              });

              sortedIncidentes.forEach((inc, idx) => {
                const costoDistinto = inc.costo_servicio_esperado !== null &&
                  Math.abs((inc.costo_servicio_cobrado || 0) - inc.costo_servicio_esperado) > 0.01;
                const kmDistinto = inc.cant_km_esperado !== null &&
                  Math.abs((inc.cant_km_cobrado || 0) - inc.cant_km_esperado) > 0.01;
                
                let isSharedRoute = false;
                if (inc.fecha_cierre) {
                  if (inc.spst_id) {
                    const key = `${inc.fecha_cierre}|spst-${inc.spst_id}`;
                    isSharedRoute = (sharedGroupCount[key] || 0) >= 2;
                  } else if (inc.localidad_cliente) {
                    const key = `${inc.fecha_cierre}|loc-${inc.localidad_cliente}`;
                    isSharedRoute = (sharedGroupCount[key] || 0) >= 2;
                  }
                }
                
                // Highlight only the incident with viatico (KMs > 0) in shared routes
                const shouldHighlight = isSharedRoute && inc.cant_km_cobrado > 0;

                if (inc.fecha_cierre !== lastDate) {
                  lastDate = inc.fecha_cierre;
                  rows.push(
                    <tr key={`date-${inc.fecha_cierre}-${idx}`} className="bg-brand-50 border-t border-brand-200">
                      <td colSpan={8} className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-brand-700 tracking-wide">
                          📅 {inc.fecha_cierre || "Sin fecha"}
                        </span>
                      </td>
                    </tr>
                  );
                }

                rows.push(
                  <tr
                    key={inc.id}
                    className={`hover:bg-gray-50 text-gray-700 transition-colors ${
                      shouldHighlight ? "bg-amber-50 hover:bg-amber-100 font-medium text-amber-900" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      <a
                        href={`https://webagentes.canaldirecto.com.ar/incidents/view/${inc.numero_incidente}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        {inc.numero_incidente}
                      </a>
                    </td>
                    <td className="px-4 py-2 capitalize text-xs">{inc.tipo.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-xs">{inc.empresa_nombre || "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {inc.url_maps ? (
                        <a
                          href={inc.url_maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline underline-offset-2 transition-colors group"
                        >
                          {inc.sucursal_nombre || "—"}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-50 group-hover:opacity-100 flex-shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </a>
                      ) : (
                        <span>{inc.sucursal_nombre || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">{inc.fecha_cierre || "—"}</td>
                    <td className={`px-4 py-2 text-right text-xs ${costoDistinto ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                      {formatMonto(inc.costo_servicio_cobrado)}
                      {costoDistinto && inc.costo_servicio_esperado !== null && (
                        <span className="block text-gray-400 font-normal">esp: {formatMonto(inc.costo_servicio_esperado)}</span>
                      )}
                    </td>
                    <td className={`px-4 py-2 text-right text-xs ${kmDistinto ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                      {inc.cant_km_cobrado > 0 ? `${inc.cant_km_cobrado} km` : "—"}
                      {kmDistinto && inc.cant_km_esperado !== null && (
                        <span className="block text-gray-400 font-normal">esp: {inc.cant_km_esperado} km</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-medium text-gray-800">
                      {formatMonto(inc.costo_total_cobrado)}
                    </td>
                  </tr>
                );
              });

              return rows;
            })()}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs tracking-wider text-gray-500 font-semibold">
                Totales
              </td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{formatMonto(totalCostoServ)}</td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{totalKms > 0 ? `${totalKms} km` : "—"}</td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{formatMonto(totalGeneral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const ModeloFacturacion = ({ incidentes }: { incidentes: Incidente[] }) => {
  const correctivos = incidentes.filter(i => i.tipo.toLowerCase() !== "preventivo");
  const preventivos = incidentes.filter(i => i.tipo.toLowerCase() === "preventivo");

  // Correctivos
  const corrCant = correctivos.length;
  const corrTotalServ = correctivos.reduce((acc, i) => acc + (i.costo_servicio_cobrado || 0), 0);
  const corrUnit = corrCant > 0 ? corrTotalServ / corrCant : 0;
  const corrKmCant = correctivos.reduce((acc, i) => acc + (i.cant_km_cobrado || 0), 0);
  const corrKmTotal = correctivos.reduce((acc, i) => acc + ((i.costo_total_cobrado || 0) - (i.costo_servicio_cobrado || 0)), 0);
  const corrKmUnit = corrKmCant > 0 ? corrKmTotal / corrKmCant : 0;

  // Preventivos
  const prevCant = preventivos.length;
  const prevTotalServ = preventivos.reduce((acc, i) => acc + (i.costo_servicio_cobrado || 0), 0);
  const prevUnit = prevCant > 0 ? prevTotalServ / prevCant : 0;
  const prevKmCant = preventivos.reduce((acc, i) => acc + (i.cant_km_cobrado || 0), 0);
  const prevKmTotal = preventivos.reduce((acc, i) => acc + ((i.costo_total_cobrado || 0) - (i.costo_servicio_cobrado || 0)), 0);
  const prevKmUnit = prevKmCant > 0 ? prevKmTotal / prevKmCant : 0;

  const totalGeneral = incidentes.reduce((acc, i) => acc + (i.costo_total_cobrado || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6 shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700">Modelo Facturación</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <th className="px-4 py-2.5 w-16 text-center">ITEM</th>
              <th className="px-4 py-2.5 text-left">DESCRIPCION</th>
              <th className="px-4 py-2.5 text-center w-24">Cant</th>
              <th className="px-4 py-2.5 text-right w-32">$ Unit</th>
              <th className="px-4 py-2.5 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {/* ITEM 1 - CORRECTIVOS */}
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center font-bold text-gray-900 border-r border-gray-100 bg-slate-50/30">1</td>
              <td className="px-4 py-2.5 font-bold uppercase text-gray-900">Correctivos</td>
              <td className="px-4 py-2.5 text-center font-semibold">{corrCant}</td>
              <td className="px-4 py-2.5 text-right font-mono">{formatMonto(corrUnit)}</td>
              <td className="px-4 py-2.5 text-right font-bold text-gray-900 font-mono">{formatMonto(corrTotalServ)}</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 text-gray-500 font-medium">viático</td>
              <td className="px-4 py-2.5 text-center text-gray-600">{corrKmCant}</td>
              <td className="px-4 py-2.5 text-right text-gray-600 font-mono">{formatMonto(corrKmUnit)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-800 font-mono">{formatMonto(corrKmTotal)}</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">Costo viejo</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">viático</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">Inc Doble</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>

            {/* ITEM 2 - PREVENTIVOS */}
            <tr className="hover:bg-slate-50/50 border-t border-gray-200">
              <td className="px-4 py-2.5 text-center font-bold text-gray-900 border-r border-gray-100 bg-slate-50/30">2</td>
              <td className="px-4 py-2.5 font-bold uppercase text-gray-900">Preventivos</td>
              <td className="px-4 py-2.5 text-center font-semibold">{prevCant}</td>
              <td className="px-4 py-2.5 text-right font-mono">{formatMonto(prevUnit)}</td>
              <td className="px-4 py-2.5 text-right font-bold text-gray-900 font-mono">{formatMonto(prevTotalServ)}</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">Costo viejo</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 text-gray-500 font-medium">viático</td>
              <td className="px-4 py-2.5 text-center text-gray-600">{prevKmCant}</td>
              <td className="px-4 py-2.5 text-right text-gray-600 font-mono">{formatMonto(prevKmUnit)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-800 font-mono">{prevKmTotal > 0 ? formatMonto(prevKmTotal) : "—"}</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">Redondeo</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>
            <tr className="text-gray-400 opacity-60 bg-gray-50/30 hover:bg-slate-50/50">
              <td className="px-4 py-2.5 text-center border-r border-gray-100 bg-slate-50/30"></td>
              <td className="px-4 py-2.5 pl-8 italic">Adicional Saputo -llolay</td>
              <td className="px-4 py-2.5 text-center">0</td>
              <td className="px-4 py-2.5 text-right font-mono">$ 0,00</td>
              <td className="px-4 py-2.5 text-right font-mono">—</td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-50 border-t border-gray-300 text-gray-900 font-bold">
            <tr>
              <td colSpan={4} className="px-4 py-3 uppercase text-right text-xs tracking-wider text-gray-500 font-bold">Total General</td>
              <td className="px-4 py-3 text-right text-base text-red-600 font-mono">{formatMonto(totalGeneral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
