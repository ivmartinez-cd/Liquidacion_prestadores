"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { formatMonto } from "@/lib/utils";
import { api } from "@/lib/api";

export interface ObservacionIncidenteRef {
  incidente_id: number;
  rol: string;
}

export interface Observacion {
  id: number;
  tipo_observacion: string;
  severidad: string;
  titulo: string;
  descripcion: string | null;
  datos_contexto: Record<string, any> | null;
  monto_cobrado: number;
  monto_esperado: number;
  diferencia: number;
  estado: string;
  regla_codigo: string | null;
  fecha_generacion: string;
  incidentes: ObservacionIncidenteRef[];
}

export interface IncidenteSnap {
  id: number;
  numero_incidente: string;
  empresa_nombre: string;
  sucursal_nombre: string;
  cant_km_cobrado: number;
  costo_total_cobrado: number;
  localidad_cliente?: string | null;
  fecha_cierre?: string | null;
}

interface ObservacionCardProps {
  observacion: Observacion;
  incidenteMap: Record<number, IncidenteSnap>;
  liquidacionId: number;
  onRefresh: () => void;
}

const SEVERIDAD_CONFIG: Record<string, { border: string; bg: string; badge: string; icon: React.ReactNode; label: string }> = {
  CRITICO: {
    border: "border-red-300",
    bg: "bg-red-50",
    badge: "bg-red-600 text-white",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    label: "CRÍTICO",
  },
  ADVERTENCIA: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    badge: "bg-amber-500 text-white",
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    label: "ADVERTENCIA",
  },
  INFORMATIVO: {
    border: "border-sky-200",
    bg: "bg-sky-50/50",
    badge: "bg-sky-400 text-white",
    icon: <Info className="w-4 h-4 text-sky-500" />,
    label: "INFORMATIVO",
  },
  AJUSTE_SUGERIDO: {
    border: "border-green-300",
    bg: "bg-green-50",
    badge: "bg-green-600 text-white",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    label: "AJUSTE SUGERIDO",
  },
};

const ESTADO_CONFIG: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  en_revision: "bg-brand-100 text-brand-700",
  resuelta: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
  excepcion_aprobada: "bg-purple-100 text-purple-700",
};

export const ObservacionCard = ({
  observacion,
  incidenteMap,
  liquidacionId,
  onRefresh,
}: ObservacionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = SEVERIDAD_CONFIG[observacion.severidad] || SEVERIDAD_CONFIG.ADVERTENCIA;
  const hasDiff = Math.abs(observacion.diferencia) > 0.01;

  const handleEstado = async (nuevoEstado: string) => {
    setSaving(true);
    try {
      await api.cambiarEstadoObservacion(liquidacionId, observacion.id, nuevoEstado);
      onRefresh();
    } catch {
      // silently ignore; user will see state unchanged
    } finally {
      setSaving(false);
    }
  };

  const ctx = observacion.datos_contexto;

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${cfg.border} ${cfg.bg}`}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start gap-2 min-w-0">
          {cfg.icon}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${ESTADO_CONFIG[observacion.estado] || "bg-gray-100 text-gray-600"}`}>
                {observacion.estado.replace(/_/g, " ")}
              </span>
              {observacion.regla_codigo && (
                <span className="text-[10px] font-mono text-gray-400">{observacion.regla_codigo}</span>
              )}
              {(() => {
                const principalRef = observacion.incidentes.find(r => r.rol === "principal") || observacion.incidentes[0];
                const principalInc = principalRef ? incidenteMap[principalRef.incidente_id] : null;
                if (!principalInc) return null;
                
                return (
                  <>
                    {principalInc.empresa_nombre && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                        Cliente: {principalInc.empresa_nombre}
                      </span>
                    )}
                    {principalInc.fecha_cierre && (
                      <span className="text-[10px] bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full font-medium">
                        📅 {principalInc.fecha_cierre}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-1 leading-tight">{observacion.titulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasDiff && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Exceso cobrado</p>
              <p className="text-sm font-bold text-red-700">{formatMonto(Math.abs(observacion.diferencia))}</p>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-200 bg-white">
          {/* Economic summary */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 text-center py-3 text-xs">
            <div className="px-4">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">Cobrado</p>
              <p className="font-semibold text-gray-800">{formatMonto(observacion.monto_cobrado)}</p>
            </div>
            <div className="px-4">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">Esperado</p>
              <p className="font-semibold text-gray-800">{formatMonto(observacion.monto_esperado)}</p>
            </div>
            <div className="px-4">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">Diferencia</p>
              <p className={`font-bold ${hasDiff ? "text-red-700" : "text-green-700"}`}>
                {hasDiff ? `-${formatMonto(Math.abs(observacion.diferencia))}` : "—"}
              </p>
            </div>
          </div>

          {/* Incident rows */}
          <div className="border-t border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-1.5 text-left">Incidente</th>
                  <th className="px-4 py-1.5 text-left">Cliente</th>
                  <th className="px-4 py-1.5 text-left">Sucursal / Localidad</th>
                  <th className="px-4 py-1.5 text-right">KMs</th>
                  <th className="px-4 py-1.5 text-right">Total</th>
                  <th className="px-4 py-1.5 text-center">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {observacion.incidentes.map((ref) => {
                  const inc = incidenteMap[ref.incidente_id];
                  if (!inc) return null;
                  const isPrincipal = ref.rol === "principal";
                  return (
                    <tr key={ref.incidente_id} className={isPrincipal ? "bg-amber-50/40" : ""}>
                      <td className="px-4 py-2 font-mono">
                        <a
                          href={`https://webagentes.canaldirecto.com.ar/incidents/view/${inc.numero_incidente}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inc.numero_incidente}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-700 font-medium">
                        {inc.empresa_nombre || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {inc.sucursal_nombre || "—"}
                        {inc.localidad_cliente && (
                          <span className="block text-gray-400">{inc.localidad_cliente}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {inc.cant_km_cobrado > 0 ? `${inc.cant_km_cobrado} km` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">
                        {formatMonto(inc.costo_total_cobrado)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPrincipal
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isPrincipal ? "principal" : "referencia"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Context */}
          {ctx && Object.keys(ctx).length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Contexto</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {Object.entries(ctx).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-gray-800 font-mono font-medium text-right truncate">
                      {Array.isArray(v)
                        ? v.join(", ")
                        : typeof v === "object" && v !== null
                        ? JSON.stringify(v)
                        : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 justify-end">
            {observacion.estado === "pendiente" && (
              <>
                <button
                  onClick={() => handleEstado("en_revision")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 border border-brand-300 text-brand-700 rounded-lg hover:bg-brand-50 disabled:opacity-50"
                >
                  En revisión
                </button>
                <button
                  onClick={() => handleEstado("excepcion_aprobada")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50"
                >
                  Aprobar excepción
                </button>
                <button
                  onClick={() => handleEstado("resuelta")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Marcar resuelta
                </button>
              </>
            )}
            {observacion.estado === "en_revision" && (
              <>
                <button
                  onClick={() => handleEstado("excepcion_aprobada")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50"
                >
                  Aprobar excepción
                </button>
                <button
                  onClick={() => handleEstado("rechazada")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Solicitar corrección
                </button>
                <button
                  onClick={() => handleEstado("resuelta")}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Marcar resuelta
                </button>
              </>
            )}
            {(observacion.estado === "resuelta" || observacion.estado === "rechazada" || observacion.estado === "excepcion_aprobada") && (
              <button
                onClick={() => handleEstado("en_revision")}
                disabled={saving}
                className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Reabrir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
