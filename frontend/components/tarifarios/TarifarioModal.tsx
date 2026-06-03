"use client";

import { X, DollarSign, AlertCircle, Check } from "lucide-react";
import { Prestador } from "./types";

export interface TarifarioForm {
  prestador_id: string;
  tipo_servicio: string;
  zona: string;
  costo_servicio: string;
  costo_km: string;
  vigencia_desde: string;
  vigencia_hasta: string;
}

interface TarifarioModalProps {
  isOpen: boolean;
  editId: number | null;
  form: TarifarioForm;
  error: string;
  prestadores: Prestador[];
  availableZones: string[];
  onClose: () => void;
  onChangeForm: (updated: TarifarioForm) => void;
  onSave: () => void;
}

const TIPOS = [
  { value: "correctivo", label: "Correctivo" },
  { value: "preventivo", label: "Preventivo" },
  { value: "instalacion_desinstalacion", label: "Instalación/Desinstalación" },
  { value: "pre_correctivo", label: "Pre-Correctivo" },
  { value: "guardia", label: "Guardia" },
  { value: "sistemas", label: "Sistemas" },
];

export const TarifarioModal = ({
  isOpen,
  editId,
  form,
  error,
  prestadores,
  availableZones,
  onClose,
  onChangeForm,
  onSave,
}: TarifarioModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-500" />
            {editId ? "Editar Tarifario" : "Nueva Tarifa / Actualización"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Prestador *
              </label>
              <select
                value={form.prestador_id}
                onChange={(e) => onChangeForm({ ...form, prestador_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
              >
                <option value="">Selecciona un prestador...</option>
                {prestadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_corto} ({p.nombre})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Tipo de Servicio *
                </label>
                <select
                  value={form.tipo_servicio}
                  onChange={(e) => onChangeForm({ ...form, tipo_servicio: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Zona (Opcional)
                </label>
                <input
                  list="available-zones-modal"
                  value={form.zona}
                  onChange={(e) => onChangeForm({ ...form, zona: e.target.value })}
                  placeholder="Vacío = Toda la cobertura"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                />
                <datalist id="available-zones-modal">
                  {availableZones.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Costo de Servicio ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.costo_servicio}
                    onChange={(e) => onChangeForm({ ...form, costo_servicio: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Costo KM ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.costo_km}
                    onChange={(e) => onChangeForm({ ...form, costo_km: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Vigencia Desde *
                </label>
                <input
                  type="date"
                  value={form.vigencia_desde}
                  onChange={(e) => onChangeForm({ ...form, vigencia_desde: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Vigencia Hasta
                </label>
                <input
                  type="date"
                  value={form.vigencia_hasta}
                  onChange={(e) => onChangeForm({ ...form, vigencia_hasta: e.target.value })}
                  placeholder="Vacío = Permanente"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-transparent px-4 py-2.5 rounded-lg hover:bg-slate-200/40 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white border border-indigo-600 px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Check className="w-4 h-4" />
            {editId ? "Guardar Cambios" : "Guardar Tarifa"}
          </button>
        </div>
      </div>
    </div>
  );
};
