"use client";

import { Calendar, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { formatMonto, formatFecha } from "@/lib/utils";
import { Tarifario, GroupedService } from "./types";

interface TarifarioHistoryTimelineProps {
  service: GroupedService;
  onEdit: (t: Tarifario) => void;
  onDelete: (id: number) => void;
}

export const TarifarioHistoryTimeline = ({
  service,
  onEdit,
  onDelete,
}: TarifarioHistoryTimelineProps) => {
  const calculateVariation = (current: number, previous: number) => {
    if (!previous) return null;
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    return {
      diff,
      pct,
      isIncrease: diff > 0,
      isDecrease: diff < 0,
    };
  };

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-4 transition-all duration-300">
      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-left">
        Línea de tiempo de tarifas
      </h5>
      <div className="relative pl-6 border-l border-slate-200 space-y-6">
        {service.history.map((hist, idx) => {
          const older = service.history[idx + 1];
          const variation = older ? calculateVariation(hist.costo_servicio, older.costo_servicio) : null;
          const isCurrent = service.active?.id === hist.id;

          return (
            <div key={hist.id} className="relative text-left">
              {/* Timeline indicator dot */}
              <span
                className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                  isCurrent ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-300"
                }`}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">
                      {formatMonto(hist.costo_servicio)}
                    </span>
                    <span className="text-xs text-slate-500">|</span>
                    <span className="text-xs font-medium text-slate-600">
                      {formatMonto(hist.costo_km)}/km
                    </span>

                    {isCurrent && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Vigente hoy
                      </span>
                    )}

                    {/* Price variation indicator */}
                    {variation && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          variation.isIncrease
                            ? "bg-emerald-50 text-emerald-700"
                            : variation.isDecrease
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {variation.isIncrease ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {variation.pct === 0
                          ? "Sin cambios"
                          : `${variation.isIncrease ? "+" : ""}${variation.pct.toFixed(1)}%`}
                      </span>
                    )}
                    {!older && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Inicial
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Periodo:</span>
                    <span className="font-semibold text-slate-700">
                      {formatFecha(hist.vigencia_desde)}
                    </span>
                    <span>al</span>
                    <span className="font-semibold text-slate-700">
                      {hist.vigencia_hasta ? formatFecha(hist.vigencia_hasta) : "actualidad"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(hist)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(hist.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-slate-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
