"use client";

import { useState } from "react";
import { Plus, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { Prestador, Tarifario, GroupedService } from "./types";
import { ServiceTarifaRow } from "./ServiceTarifaRow";

interface PrestadorTarifasCardProps {
  prestador: Prestador;
  items: Tarifario[];
  onAddTarifa: () => void;
  onUpdateActive: (service: GroupedService) => void;
  onEdit: (t: Tarifario) => void;
  onDelete: (id: number) => void;
}

export const PrestadorTarifasCard = ({
  prestador,
  items,
  onAddTarifa,
  onUpdateActive,
  onEdit,
  onDelete,
}: PrestadorTarifasCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getGroupedServices = (prestadorItems: Tarifario[]): GroupedService[] => {
    const map: Record<string, GroupedService> = {};
    const todayStr = new Date().toISOString().split("T")[0];

    prestadorItems.forEach((t) => {
      const key = `${t.tipo_servicio}::${t.zona || ""}`;
      if (!map[key]) {
        map[key] = {
          tipo_servicio: t.tipo_servicio,
          zona: t.zona,
          history: [],
          active: null,
        };
      }
      map[key].history.push(t);
    });

    Object.values(map).forEach((service) => {
      // sort desc by date
      service.history.sort((a, b) => b.vigencia_desde.localeCompare(a.vigencia_desde));

      // Find active: the first one where vigencia_desde <= today and (vigencia_hasta is null or >= today)
      const active = service.history.find(
        (t) =>
          t.vigencia_desde <= todayStr &&
          (t.vigencia_hasta === null || t.vigencia_hasta >= todayStr)
      );
      service.active = active || service.history[0] || null;
    });

    return Object.values(map).sort((a, b) => a.tipo_servicio.localeCompare(b.tipo_servicio));
  };

  const groupedServices = getGroupedServices(items);

  if (groupedServices.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3">
          <Briefcase className="w-6 h-6" />
        </div>
        <h3 className="text-md font-bold text-slate-800">{prestador.nombre}</h3>
        <p className="text-xs text-slate-500 mt-1">Este prestador no tiene tarifas cargadas actualmente.</p>
        <button
          onClick={onAddTarifa}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Configurar tarifas iniciales
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Prestador header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex items-center justify-between cursor-pointer select-none ${
          isExpanded ? "border-b border-slate-100" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-slate-400 hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              PST CORRESPONDIENTE
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1 flex items-center gap-2">
              {prestador.nombre}
              <span className="text-xs font-mono font-medium text-slate-400">
                ({prestador.nombre_corto})
              </span>
            </h3>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTarifa();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar Tarifa
        </button>
      </div>

      {/* Services list */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {groupedServices.map((service) => (
            <ServiceTarifaRow
              key={`${service.tipo_servicio}-${service.zona || "general"}`}
              service={service}
              prestadorId={prestador.id}
              onUpdateActive={() => onUpdateActive(service)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
