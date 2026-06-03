"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { clsRiesgo, labelRiesgo, clsEstadoAlerta, formatMonto } from "@/lib/utils";

interface AlertaDetail {
  id: number;
  tipo_alerta: string;
  descripcion: string;
  riesgo: number;
  estado: string;
  datos_contexto: Record<string, unknown> | null;
  incidente: {
    id: number;
    numero_incidente: string;
    tipo: string;
    empresa_nombre: string;
    sucursal_nombre: string;
    nro_serie: string;
    fecha_cierre: string;
    costo_total_cobrado: number;
  };
  resoluciones: {
    id: number;
    decision: string;
    justificacion: string;
    comentario: string;
    fecha: string;
  }[];
  liquidacion_id: number;
}

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

export default function AlertaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [alerta, setAlerta] = useState<AlertaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    api.getAlerta(Number(id)).then(setAlerta).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleResolver = async () => {
    if (!decision) { setMsg("Seleccioná una decisión."); return; }
    setSaving(true);
    try {
      await api.resolverAlerta(Number(id), { decision, justificacion, comentario });
      setMsg("Alerta resuelta.");
      load();
    } catch {
      setMsg("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDescartar = async () => {
    await api.descartarAlerta(Number(id));
    router.back();
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando...</div>;
  if (!alerta) return <div className="p-6 text-sm text-red-500">Alerta no encontrada.</div>;

  const inc = alerta.incidente;
  const ctx = alerta.datos_contexto;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/alertas" className="text-xs text-blue-600 hover:underline mb-1 block">← Volver a alertas</Link>
          <h2 className="text-xl font-bold text-gray-800">
            {alerta.tipo_alerta} — Alerta #{alerta.id}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded border font-bold ${clsRiesgo(alerta.riesgo)}`}>
            {Math.round(alerta.riesgo)} — {labelRiesgo(alerta.riesgo)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${clsEstadoAlerta(alerta.estado)}`}>
            {alerta.estado}
          </span>
        </div>
      </div>

      {/* Descripción */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm font-medium text-amber-900">{alerta.descripcion}</p>
      </div>

      {/* Incidente */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700 border-b pb-2">Incidente #{inc.numero_incidente}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Tipo</dt>
          <dd className="font-medium text-gray-800 capitalize">{inc.tipo.replace(/_/g, " ")}</dd>
          <dt className="text-gray-500">Empresa</dt>
          <dd className="text-gray-800">{inc.empresa_nombre || "-"}</dd>
          <dt className="text-gray-500">Sucursal</dt>
          <dd className="text-gray-800">{inc.sucursal_nombre || "-"}</dd>
          <dt className="text-gray-500">Nro. Serie</dt>
          <dd className="text-gray-800 font-mono text-xs">{inc.nro_serie || "-"}</dd>
          <dt className="text-gray-500">Fecha cierre</dt>
          <dd className="text-gray-800">{inc.fecha_cierre || "-"}</dd>
          <dt className="text-gray-500">Costo total cobrado</dt>
          <dd className="font-semibold text-gray-800">{formatMonto(inc.costo_total_cobrado)}</dd>
        </dl>
        <Link
          href={`/liquidaciones/${alerta.liquidacion_id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver liquidación completa →
        </Link>
      </div>

      {/* Contexto */}
      {ctx && Object.keys(ctx).length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Contexto del análisis</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {Object.entries(ctx).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</dt>
                <dd className="text-gray-800 font-mono text-xs break-all">
                  {Array.isArray(v) ? v.join(", ") : String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Resoluciones previas */}
      {alerta.resoluciones.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-sm text-gray-700">Historial de resoluciones</h3>
          {alerta.resoluciones.map((r) => (
            <div key={r.id} className="text-sm border-l-2 border-green-300 pl-3">
              <p className="font-medium text-gray-800">{r.decision.replace(/_/g, " ")}</p>
              {r.justificacion && <p className="text-gray-600 text-xs">{r.justificacion}</p>}
              {r.comentario && <p className="text-gray-500 text-xs italic">{r.comentario}</p>}
              <p className="text-gray-400 text-xs">{r.fecha}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de resolución */}
      {alerta.estado === "pendiente" || alerta.estado === "en_revision" ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-sm text-gray-700">Resolver alerta</h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Decisión *</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccioná una decisión...</option>
              {DECISIONES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Justificación</label>
            <select
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccioná una justificación...</option>
              {JUSTIFICACIONES.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Comentario adicional</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Detalle opcional..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {msg && <p className="text-sm text-blue-600">{msg}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleResolver}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Resolver alerta"}
            </button>
            <button
              onClick={handleDescartar}
              className="px-4 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Descartar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-400 py-4">
          Esta alerta ya fue {alerta.estado}.
        </div>
      )}
    </div>
  );
}
