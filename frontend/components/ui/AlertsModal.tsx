"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { clsRiesgo, labelRiesgo, clsEstadoAlerta, formatMonto, TIPO_ALERTA_LABEL } from "@/lib/utils";
import { X, AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export interface Alerta {
  id: number;
  incidente_id: number;
  liquidacion_id: number;
  tipo_alerta: string;
  descripcion: string;
  riesgo: number;
  estado: string;
  fecha_generacion: string;
  datos_contexto?: any;
}

export interface Incidente {
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
  alertas: Alerta[];
}

interface AlertsModalProps {
  incidente: Incidente;
  onClose: () => void;
  onRefresh: () => void;
}

export const AlertsModal = ({ incidente, onClose, onRefresh }: AlertsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Incidente #{incidente.numero_incidente}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {incidente.empresa_nombre} ({incidente.sucursal_nombre}) — {incidente.tipo.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Info Stats Bar */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 grid grid-cols-3 gap-4 text-xs text-amber-900 font-medium">
          <div>
            <span className="text-[10px] text-amber-700 block font-bold uppercase tracking-wider">Costo Cobrado</span>
            <span className="text-sm font-semibold">{formatMonto(incidente.costo_total_cobrado)}</span>
          </div>
          {incidente.costo_servicio_esperado !== null && (
            <div>
              <span className="text-[10px] text-amber-700 block font-bold uppercase tracking-wider">Costo Esperado</span>
              <span className="text-sm font-semibold">{formatMonto(incidente.costo_servicio_esperado)}</span>
            </div>
          )}
          {incidente.cant_km_cobrado > 0 && (
            <div>
              <span className="text-[10px] text-amber-700 block font-bold uppercase tracking-wider">Kilómetros</span>
              <span className="text-sm font-semibold">
                {incidente.cant_km_cobrado} km 
                {incidente.cant_km_esperado !== null && ` (esp: ${incidente.cant_km_esperado} km)`}
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {incidente.alertas && incidente.alertas.length > 0 ? (
            <div className="space-y-4">
              {incidente.alertas.map((a) => (
                <AlertItem key={a.id} alerta={a} onRefresh={onRefresh} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-sm">Sin alertas activas</p>
              <p className="text-xs text-gray-400 mt-1">Este incidente se encuentra validado y en orden.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertItem = ({ alerta, onRefresh }: { alerta: Alerta; onRefresh: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [resoluciones, setResoluciones] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [decision, setDecision] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadDetails = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    setLoadingHistory(true);
    try {
      const data = await api.getAlerta(alerta.id);
      setResoluciones(data.resoluciones || []);
    } catch (e) {
      console.error("Error al cargar historial de resoluciones", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleResolver = async () => {
    if (!decision) {
      setMsg("Seleccioná una decisión.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await api.resolverAlerta(alerta.id, { decision, justificacion, comentario });
      setMsg("Alerta resuelta.");
      setIsResolving(false);
      onRefresh();
    } catch (e: any) {
      setMsg(e.message || "Error al resolver la alerta.");
    } finally {
      setSaving(false);
    }
  };

  const handleDescartar = async () => {
    setSaving(true);
    try {
      await api.descartarAlerta(alerta.id);
      onRefresh();
    } catch (e: any) {
      alert(e.message || "Error al descartar la alerta.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnRevision = async () => {
    setSaving(true);
    try {
      await api.marcarEnRevision(alerta.id);
      onRefresh();
    } catch (e: any) {
      alert(e.message || "Error al marcar en revisión.");
    } finally {
      setSaving(false);
    }
  };

  const DECISIONES = [
    { value: "aprobar_excepcion", label: "Aprobar excepción" },
    { value: "solicitar_correccion", label: "Solicitar corrección al prestador" },
    { value: "ignorar", label: "Ignorar / Sin impacto" },
    { value: "escalar", label: "Escalar a supervisión" },
  ];

  const JUSTIFICACIONES = [
    "Segunda visita por repuesto",
    "Viaje autorizado especial",
    "Error operativo del sistema",
    "Tarifa acordada fuera del sistema",
    "Ruta compartida autorizada",
    "Excepción de zona aprobada",
    "Otro",
  ];

  const ctx = alerta.datos_contexto;

  return (
    <div className={`border rounded-xl p-4 transition-all duration-200 bg-white ${
      alerta.estado === "resuelta" ? "border-green-200 shadow-sm" :
      alerta.estado === "descartada" ? "border-gray-200 shadow-sm" :
      alerta.estado === "en_revision" ? "border-blue-200 shadow-md" :
      "border-amber-200 shadow-md"
    }`}>
      {/* Alert Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 w-full text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${clsRiesgo(alerta.riesgo)}`}>
              {Math.round(alerta.riesgo)} — {labelRiesgo(alerta.riesgo)}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${clsEstadoAlerta(alerta.estado)}`}>
              {alerta.estado.replace(/_/g, " ")}
            </span>
          </div>
          <h4 className="font-semibold text-gray-800 text-sm mt-1">
            {TIPO_ALERTA_LABEL[alerta.tipo_alerta] || alerta.tipo_alerta}
          </h4>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">{alerta.descripcion}</p>
        </div>
        <button
          onClick={loadDetails}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors shrink-0"
          title="Ver detalles e historial"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details (Context & Resolution History) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Context */}
          {ctx && Object.keys(ctx).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Contexto de la Validación</h5>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Object.entries(ctx).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-gray-500 capitalize text-left">{k.replace(/_/g, " ")}</dt>
                    <dd className="text-gray-800 font-mono font-medium text-right truncate break-all">
                      {Array.isArray(v) ? v.join(", ") : typeof v === "number" && k.toLowerCase().includes("costo") ? formatMonto(v) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Resolutions History */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Historial de Resoluciones</h5>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : resoluciones.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {resoluciones.map((r) => (
                  <div key={r.id} className="text-xs border-l-2 border-green-400 pl-3 py-1 bg-green-50/50 rounded-r p-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-900 capitalize">{r.decision.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-gray-400">{new Date(r.fecha).toLocaleString("es-AR")}</span>
                    </div>
                    {r.justificacion && <p className="text-gray-700 font-medium mt-0.5">Justificación: {r.justificacion}</p>}
                    {r.comentario && <p className="text-gray-500 italic mt-0.5">"{r.comentario}"</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-left">No hay resoluciones previas.</p>
            )}
          </div>
        </div>
      )}

      {/* Inline Form for Resolution */}
      {isResolving && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 bg-blue-50/30 p-3 rounded-lg border border-blue-100">
          <h5 className="text-xs font-bold text-blue-900 text-left">Resolver Alerta</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Decisión *</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccioná una decisión...</option>
                {DECISIONES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Justificación</label>
              <select
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccioná una justificación...</option>
                {JUSTIFICACIONES.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-left">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Comentario adicional</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Detalle opcional..."
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {msg && <p className="text-xs font-semibold text-blue-600 text-left">{msg}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsResolving(false)}
              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleResolver}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {/* Alert Card Footer Actions */}
      {!isResolving && (
        <div className="mt-3 flex gap-2 justify-end">
          {alerta.estado === "pendiente" || alerta.estado === "en_revision" ? (
            <>
              <button
                onClick={() => setIsResolving(true)}
                className="px-2.5 py-1 text-xs text-blue-600 border border-blue-300 hover:bg-blue-50 font-medium rounded-md transition-colors"
              >
                Resolver
              </button>
              {alerta.estado !== "en_revision" && (
                <button
                  onClick={handleEnRevision}
                  disabled={saving}
                  className="px-2.5 py-1 text-xs text-amber-600 border border-amber-300 hover:bg-amber-50 font-medium rounded-md transition-colors"
                >
                  En Revisión
                </button>
              )}
              <button
                onClick={handleDescartar}
                disabled={saving}
                className="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 hover:bg-gray-50 font-medium rounded-md transition-colors"
              >
                Ignorar/Descartar
              </button>
            </>
          ) : (
            <button
              onClick={handleEnRevision}
              disabled={saving}
              className="px-2.5 py-1 text-xs text-gray-500 border border-gray-300 hover:bg-gray-100 font-medium rounded-md transition-colors"
            >
              Reabrir / En Revisión
            </button>
          )}
        </div>
      )}
    </div>
  );
};
