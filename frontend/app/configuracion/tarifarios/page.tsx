"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV, parseCSV, downloadCSVTemplate } from "@/lib/utils";
import {
  Plus,
  AlertCircle,
  Download,
  Upload,
  X,
} from "lucide-react";

import { Prestador, Tarifario, GroupedService } from "@/components/tarifarios/types";
import { PrestadorTarifasCard } from "@/components/tarifarios/PrestadorTarifasCard";
import { TarifarioModal, TarifarioForm } from "@/components/tarifarios/TarifarioModal";

const EMPTY: TarifarioForm = {
  prestador_id: "",
  tipo_servicio: "correctivo",
  zona: "",
  costo_servicio: "",
  costo_km: "",
  vigencia_desde: "",
  vigencia_hasta: ""
};

function parseMoney(val: string): number {
  if (!val) return 0;
  let s = val.replace(/[\$\s]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const s = val.trim();
  const matchDMY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, "0");
    const month = matchDMY[2].padStart(2, "0");
    const year = matchDMY[3];
    return `${year}-${month}-${day}`;
  }
  const matchYMD = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYMD) {
    return s.substring(0, 10);
  }
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  return null;
}

const headerMappings: Record<string, string> = {
  "prestador_clave": "prestador_clave",
  "prestador clave": "prestador_clave",
  "prestador": "prestador_clave",
  "f. vigen.": "vigencia_desde",
  "f. vigen": "vigencia_desde",
  "f vigen": "vigencia_desde",
  "vigencia": "vigencia_desde",
  "fecha vigencia": "vigencia_desde",
  "zona": "zona",
  "region": "zona",
  "correctivo": "correctivo",
  "preventivo": "preventivo",
  "instalacion": "instalacion",
  "instalación": "instalacion",
  "pre_correctivo": "pre_correctivo",
  "pre-correctivo": "pre_correctivo",
  "pre correctivo": "pre_correctivo",
  "p. correc.": "pre_correctivo",
  "p. correc": "pre_correctivo",
  "p correc": "pre_correctivo",
  "guardia": "guardia",
  "sistemas": "sistemas",
  "costo_km": "costo_km",
  "ctos. km": "costo_km",
  "ctos km": "costo_km",
  "costo km": "costo_km"
};

export default function TarifariosPage() {
  const [items, setItems] = useState<Tarifario[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [filtroP, setFiltroP] = useState("");
  const [form, setForm] = useState<TarifarioForm>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load available zones when prestador_id changes
  useEffect(() => {
    if (!form.prestador_id) {
      setAvailableZones([]);
      return;
    }
    api.getSPSTs(Number(form.prestador_id))
      .then((data: any) => {
        if (Array.isArray(data)) {
          const zones = Array.from(new Set(data.map((s: any) => s.zona).filter(Boolean))) as string[];
          setAvailableZones(zones.sort());
        }
      })
      .catch(() => {
        setAvailableZones([]);
      });
  }, [form.prestador_id]);

  const load = () => api.getTarifarios(filtroP ? Number(filtroP) : undefined).then(setItems);

  useEffect(() => {
    api.getPrestadores().then(setPrestadores);
  }, []);

  useEffect(() => {
    load();
  }, [filtroP]);

  const handleSave = async () => {
    setError("");
    const payload = {
      ...form,
      prestador_id: Number(form.prestador_id),
      costo_servicio: Number(form.costo_servicio),
      costo_km: Number(form.costo_km),
      zona: form.zona || null,
      vigencia_hasta: form.vigencia_hasta || null,
    };
    try {
      if (editId) await api.updateTarifario(editId, payload);
      else await api.createTarifario(payload);
      setForm(EMPTY);
      setEditId(null);
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleEdit = (t: Tarifario) => {
    setEditId(t.id);
    setForm({
      prestador_id: String(t.prestador_id),
      tipo_servicio: t.tipo_servicio,
      zona: t.zona || "",
      costo_servicio: String(t.costo_servicio),
      costo_km: String(t.costo_km),
      vigencia_desde: t.vigencia_desde,
      vigencia_hasta: t.vigencia_hasta || "",
    });
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditId(null);
    setForm({
      ...EMPTY,
      prestador_id: filtroP || (prestadores[0]?.id ? String(prestadores[0].id) : ""),
      vigencia_desde: new Date().toISOString().split("T")[0]
    });
    setShowModal(true);
  };

  const handleUpdateActive = (service: GroupedService, prestadorId: number) => {
    setEditId(null);
    setForm({
      prestador_id: String(prestadorId),
      tipo_servicio: service.tipo_servicio,
      zona: service.zona || "",
      costo_servicio: String(service.active?.costo_servicio ?? ""),
      costo_km: String(service.active?.costo_km ?? ""),
      vigencia_desde: new Date().toISOString().split("T")[0],
      vigencia_hasta: ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de tarifa?")) {
      await api.deleteTarifario(id);
      load();
    }
  };

  const downloadTemplate = () => {
    const content = `sep=,
# ==============================================================================
# PLANTILLA DE IMPORTACION DE TARIFARIOS
# ==============================================================================
# Instrucciones de llenado:
# - Puede copiar y pegar directamente las columnas de su planilla Excel.
# - Si la planilla no contiene la columna "Prestador", asegurese de seleccionar
#   el Prestador correcto en el filtro de la pagina web antes de realizar la carga.
# - F. Vigen.: Fecha de vigencia en formato DD/MM/YYYY (ej: 01/09/2024).
# - Ctos. Km: Costo por kilometro recorrido (ej: 325,00).
# - Zona: (Opcional) Region o plaza de cobertura. Dejar vacio para tarifas generales.
# - Prestador: (Opcional) Clave corta del prestador (ej: INFOMAC, PENTACOM, PERTEX, SAN JUAN).
# ==============================================================================
Correctivo,Preventivo,Instalacion,I. Contrato,Relevamiento,Presupuesto,P. Correc.,Guardia,Taller,Sistemas,Ctos. Km,F. Vigen.,Zona,Prestador
26115.00,13063.00,26115.00,13063.00,13063.00,13063.00,26115.00,39172.00,0.00,26115.00,325.00,01/09/2024,,INFOMAC
29588.00,14800.00,29588.00,14800.00,14800.00,14800.00,29588.00,44382.00,0.00,29588.00,367.60,01/10/2024,Patagonia,PENTACOM
`;
    downloadCSVTemplate(content, "plantilla_tarifarios.csv");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setImportStatus({ msg: `Procesando ${file.name}...`, type: "info" });

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        setImportStatus({ msg: "El archivo está vacío o sin encabezados.", type: "err" });
        return;
      }

      // Fetch latest list of prestadores and existing tarifarios to resolve names and avoid duplicates
      const psts = await api.getPrestadores();
      const existing = await api.getTarifarios();

      const pstMap = Object.fromEntries(psts.map((p: any) => [p.nombre_corto.toUpperCase(), p.id]));
      const existingKeys = new Set(
        existing.map((t: any) => 
          `${t.prestador_id}-${t.tipo_servicio}-${(t.zona || "").trim().toLowerCase()}-${t.vigencia_desde}`
        )
      );

      let defaultPrestadorId: number | null = filtroP ? Number(filtroP) : null;
      let creados = 0;
      let omitidos = 0;
      let errores = 0;

      const serviceMappings = [
        { csvKey: "correctivo", dbTipo: "correctivo" },
        { csvKey: "preventivo", dbTipo: "preventivo" },
        { csvKey: "instalacion", dbTipo: "instalacion_desinstalacion" },
        { csvKey: "pre_correctivo", dbTipo: "pre_correctivo" },
        { csvKey: "guardia", dbTipo: "guardia" },
        { csvKey: "sistemas", dbTipo: "sistemas" }
      ];

      for (const row of rows) {
        // Normalize headers
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([k, v]) => {
            const normKey = headerMappings[k.toLowerCase().trim()] || k;
            return [normKey, v];
          })
        );

        const clave = normalizedRow.prestador_clave?.trim().toUpperCase();
        const prestador_id = clave ? pstMap[clave] : defaultPrestadorId;
        if (!prestador_id) {
          errores++;
          continue;
        }

        const rawVigencia = normalizedRow.vigencia_desde?.trim();
        const vigencia_desde = parseDate(rawVigencia);
        if (!vigencia_desde) {
          errores++;
          continue;
        }

        const zona = normalizedRow.zona?.trim() || "";
        const costo_km = parseMoney(normalizedRow.costo_km);

        for (const mapping of serviceMappings) {
          const rawCosto = normalizedRow[mapping.csvKey]?.trim();
          if (!rawCosto) continue;

          const costo_servicio = parseMoney(rawCosto);

          const key = `${prestador_id}-${mapping.dbTipo}-${zona.toLowerCase()}-${vigencia_desde}`;
          if (existingKeys.has(key)) {
            omitidos++;
            continue;
          }

          try {
            await api.createTarifario({
              prestador_id,
              tipo_servicio: mapping.dbTipo,
              zona: zona || null,
              costo_servicio,
              costo_km,
              vigencia_desde,
              vigencia_hasta: null
            });
            creados++;
            existingKeys.add(key);
          } catch {
            errores++;
          }
        }
      }

      setImportStatus({
        msg: `Importación completa: ${creados} tarifas creadas, ${omitidos} omitidas por existir, ${errores} errores.`,
        type: creados > 0 ? "ok" : "info"
      });
      load();
    } catch (err) {
      setImportStatus({
        msg: `Error al procesar: ${err instanceof Error ? err.message : "desconocido"}`,
        type: "err"
      });
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Estructura de Tarifarios</h2>
          <p className="text-sm text-slate-500 mt-1">Configuración e historial de costos de servicios y traslados por prestador</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar planilla CSV
          </button>
          <label className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer border transition-all shadow-md hover:shadow-lg ${
            importando
              ? "border-slate-100 text-slate-400 bg-slate-50 cursor-not-allowed"
              : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
          }`}>
            <Upload className="w-3.5 h-3.5" />
            {importando ? "Cargando..." : "Cargar Planilla CSV"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importando}
              onChange={handleImport}
            />
          </label>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarifa
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`text-sm px-4 py-3 rounded-lg border flex items-center justify-between transition-all ${
          importStatus.type === "ok"  ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          importStatus.type === "err" ? "bg-rose-50 border-rose-200 text-rose-800" :
                                        "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{importStatus.msg}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrar por Prestador:</span>
            <select 
              value={filtroP} 
              onChange={(e) => setFiltroP(e.target.value)}
              className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 shadow-sm"
            >
              <option value="">Todos los prestadores</option>
              {prestadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_corto} ({p.nombre})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-full">
            {items.length} tarifas cargadas en total
          </span>
        </div>

        {/* Prestadores list */}
        {prestadores
          .filter(p => !filtroP || p.id === Number(filtroP))
          .map((p) => (
            <PrestadorTarifasCard
              key={p.id}
              prestador={p}
              items={items.filter((t) => t.prestador_id === p.id)}
              onAddTarifa={() => {
                setForm({
                  ...EMPTY,
                  prestador_id: String(p.id),
                  vigencia_desde: new Date().toISOString().split("T")[0]
                });
                setEditId(null);
                setShowModal(true);
              }}
              onUpdateActive={(service) => handleUpdateActive(service, p.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
      </div>

      <TarifarioModal
        isOpen={showModal}
        editId={editId}
        form={form}
        error={error}
        prestadores={prestadores}
        availableZones={availableZones}
        onClose={() => { setForm(EMPTY); setEditId(null); setShowModal(false); }}
        onChangeForm={setForm}
        onSave={handleSave}
      />
    </div>
  );
}
