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
  nro_serie: string;
  fecha_cierre: string;
  costo_servicio_cobrado: number;
  costo_servicio_esperado: number | null;
  cant_km_cobrado: number;
  cant_km_esperado: number | null;
  costo_total_cobrado: number;
  estado_validacion: string;
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
  total_alertas: number;
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

  const conAlertas = liq.incidentes.filter((i) => i.estado_validacion === "con_alertas");
  const ok = liq.incidentes.filter((i) => i.estado_validacion === "ok");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/liquidaciones" className="text-xs text-blue-600 hover:underline mb-1 block">← Volver</Link>
          <h2 className="text-xl font-bold text-gray-800">{liq.nombre_archivo || `Liquidación #${liq.id}`}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clsEstadoLiquidacion(liq.estado)}`}>
              {liq.estado}
            </span>
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
          {liq.total_alertas > 0 && (
            <Link
              href={`/alertas?liquidacion_id=${liq.id}`}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
            >
              Ver {liq.total_alertas} alertas
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{liq.total_incidentes}</p>
          <p className="text-xs text-gray-500">Incidentes</p>
        </div>
        <div className={`border rounded-lg p-3 text-center ${liq.total_alertas > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-2xl font-bold ${liq.total_alertas > 0 ? "text-red-700" : "text-green-700"}`}>{liq.total_alertas}</p>
          <p className="text-xs text-gray-500">Alertas</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{ok.length}</p>
          <p className="text-xs text-gray-500">Sin observaciones</p>
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

const IncidentTable = ({ titulo, incidentes, liqId }: { titulo: string, incidentes: Incidente[], liqId: number }) => {
  const conAlertas = incidentes.filter((i) => i.estado_validacion === "con_alertas");
  
  if (incidentes.length === 0) return null;

  const totalCostoServ = incidentes.reduce((acc, inc) => acc + (inc.costo_servicio_cobrado || 0), 0);
  const totalKms = incidentes.reduce((acc, inc) => acc + (inc.cant_km_cobrado || 0), 0);
  const totalGeneral = incidentes.reduce((acc, inc) => acc + (inc.costo_total_cobrado || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">{titulo} ({incidentes.length})</h3>
        {conAlertas.length > 0 && (
          <span className="text-xs text-red-600">{conAlertas.length} con alertas</span>
        )}
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
              <th className="px-4 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {incidentes.map((inc) => {
              const tieneAlerta = inc.estado_validacion === "con_alertas";
              const costoDistinto = inc.costo_servicio_esperado !== null &&
                Math.abs((inc.costo_servicio_cobrado || 0) - inc.costo_servicio_esperado) > 0.01;
              const kmDistinto = inc.cant_km_esperado !== null &&
                Math.abs((inc.cant_km_cobrado || 0) - inc.cant_km_esperado) > 0.01;

              return (
                <tr key={inc.id} className="hover:bg-gray-50 text-gray-700">
                  <td className="px-4 py-2 font-mono text-xs">
                    <a 
                      href={`https://webagentes.canaldirecto.com.ar/incidents/view/${inc.numero_incidente}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {inc.numero_incidente}
                    </a>
                  </td>
                  <td className="px-4 py-2 capitalize text-xs">{inc.tipo.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 text-xs">{inc.empresa_nombre || "—"}</td>
                  <td className="px-4 py-2 text-xs">{inc.sucursal_nombre || "—"}</td>
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
                  <td className="px-4 py-2 text-center">
                    {inc.estado_validacion === "pendiente" ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : tieneAlerta ? (
                      <Link href={`/alertas?liquidacion_id=${liqId}`}
                        className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full hover:bg-red-200">
                        Alertas
                      </Link>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs tracking-wider text-gray-500 font-semibold">
                Totales
              </td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{formatMonto(totalCostoServ)}</td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{totalKms > 0 ? `${totalKms} km` : "—"}</td>
              <td className="px-4 py-3 text-right text-xs font-semibold">{formatMonto(totalGeneral)}</td>
              <td></td>
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
    <div className="bg-white border border-gray-400 rounded-lg overflow-hidden mb-6 shadow-sm">
      <div className="bg-[#ffcc99] px-4 py-2 text-center border-b border-gray-400">
        <h3 className="font-bold text-sm text-black tracking-wide m-0">MODELO FACTURACION</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#ffcc99] text-black font-bold border-b-2 border-black">
            <tr>
              <th className="px-4 py-2 border-r border-gray-400 w-16 text-center">ITEM</th>
              <th className="px-4 py-2 border-r border-gray-400 text-center">DESCRIPCION</th>
              <th className="px-4 py-2 border-r border-gray-400 text-center w-24">Cant</th>
              <th className="px-4 py-2 border-r border-gray-400 text-center w-32">$ Unit</th>
              <th className="px-4 py-2 text-center w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 bg-[#ffe6cc] font-medium text-black">
            {/* ITEM 1 - CORRECTIVOS */}
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-bold">1</td>
              <td className="px-4 py-1.5 border-r border-gray-400 font-bold uppercase text-center">Correctivos</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">{corrCant}</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>{formatMonto(corrUnit).replace('$', '')}</span></td>
              <td className="px-4 py-1.5 font-bold"><div className="flex justify-between"><span>$</span> <span>{formatMonto(corrTotalServ).replace('$', '')}</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">viatico</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">{corrKmCant}</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>{formatMonto(corrKmUnit).replace('$', '')}</span></td>
              <td className="px-4 py-1.5 font-bold"><div className="flex justify-between"><span>$</span> <span>{formatMonto(corrKmTotal).replace('$', '')}</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">Costo viejo</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">viatico</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">Inc Doble</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>

            {/* ITEM 2 - PREVENTIVOS */}
            <tr className="border-t border-gray-400">
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-bold">2</td>
              <td className="px-4 py-1.5 border-r border-gray-400 font-bold uppercase text-center">Preventivos</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">{prevCant}</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>{formatMonto(prevUnit).replace('$', '')}</span></td>
              <td className="px-4 py-1.5 font-bold"><div className="flex justify-between"><span>$</span> <span>{formatMonto(prevTotalServ).replace('$', '')}</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">Costo viejo</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">viatico</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">{prevKmCant}</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>{formatMonto(prevKmUnit).replace('$', '')}</span></td>
              <td className="px-4 py-1.5"><div className="flex justify-between font-bold"><span>$</span> <span>{prevKmTotal > 0 ? formatMonto(prevKmTotal).replace('$', '') : '-'}</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">Redondeo</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>
            <tr>
              <td className="px-4 py-1.5 border-r border-gray-400"></td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center font-semibold">Adicional Saputo -llolay</td>
              <td className="px-4 py-1.5 border-r border-gray-400 text-center">0</td>
              <td className="px-4 py-1.5 border-r border-gray-400 flex justify-between"><span>$</span> <span>0,00</span></td>
              <td className="px-4 py-1.5 text-center text-black font-bold"><div className="flex justify-between"><span>$</span> <span>-</span></div></td>
            </tr>
          </tbody>
          <tfoot className="bg-[#ffff99] font-bold border-t-2 border-black text-black">
            <tr>
              <td colSpan={4} className="px-4 py-2 border-r border-gray-400 uppercase text-right">Total</td>
              <td className="px-4 py-2 font-bold text-red-600"><div className="flex justify-between"><span>$</span> <span>{formatMonto(totalGeneral).replace('$', '')}</span></div></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
