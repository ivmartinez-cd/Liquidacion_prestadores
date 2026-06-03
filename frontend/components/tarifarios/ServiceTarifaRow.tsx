"use client";

import { useState } from "react";
import { Zap, History, ChevronDown, ChevronUp } from "lucide-react";
import { formatMonto, formatFecha } from "@/lib/utils";
import { Tarifario, GroupedService } from "./types";
import { TarifarioHistoryTimeline } from "./TarifarioHistoryTimeline";

interface ServiceTarifaRowProps {
  service: GroupedService;
  prestadorId: number;
  onUpdateActive: () => void;
  onEdit: (t: Tarifario) => void;
  onDelete: (id: number) => void;
}

export const ServiceTarifaRow = ({
  service,
  prestadorId,
  onUpdateActive,
  onEdit,
  onDelete,
}: ServiceTarifaRowProps) => {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  return (
    <div className="p-6 space-y-4 hover:bg-slate-50/40 transition-colors text-left">
      {/* Service main header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-md capitalize">
              {service.tipo_servicio.replace(/_/g, " ")}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <span>Zona:</span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {service.zona || "Toda la cobertura"}
              </span>
            </p>
          </div>
        </div>

        {/* Active values summary */}
        {service.active && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-indigo-50/60 rounded-xl px-4 py-2 border border-indigo-100/50 flex flex-col text-right">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">
                Costo Servicio
              </span>
              <span className="text-md font-bold text-indigo-900 mt-0.5">
                {formatMonto(service.active.costo_servicio)}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 flex flex-col text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Costo KM
              </span>
              <span className="text-md font-bold text-slate-700 mt-0.5">
                {formatMonto(service.active.costo_km)}/km
              </span>
            </div>
            <div className="bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100/50 flex flex-col text-right">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                Desde
              </span>
              <span className="text-xs font-semibold text-emerald-800 mt-0.5">
                {formatFecha(service.active.vigencia_desde)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={onUpdateActive}
                className="text-xs font-semibold bg-white text-indigo-600 border border-slate-200 hover:border-indigo-600 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Actualizar
              </button>
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial ({service.history.length})</span>
                {isHistoryExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History timeline container */}
      {isHistoryExpanded && (
        <TarifarioHistoryTimeline
          service={service}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};
