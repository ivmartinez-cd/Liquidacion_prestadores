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
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Briefcase
} from "lucide-react";

interface Prestador { id: number; nombre: string; nombre_corto: string; region?: string; }
interface SPST { id: number; nombre: string; prestador_id: number; }
interface TablaKM {
  id: number;
  prestador_id: number;
  spst_id: number | null;
  empresa_nombre: string;
  sucursal_nombre: string;
  domicilio_cliente: string | null;
  localidad_cliente: string | null;
  nro_serie: string | null;
  kms_recorrido: number;
  umbral_viatico: number;
  aplica_viatico: boolean;
  kms_a_facturar: number;
  url_maps: string | null;
}

const EMPTY = {
  prestador_id: "", spst_id: "", empresa_nombre: "", sucursal_nombre: "",
  domicilio_cliente: "", localidad_cliente: "",
  nro_serie: "", kms_recorrido: "", umbral_viatico: "30", url_maps: "",
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

const headerMappings: Record<string, string> = {
  "prestador": "prestador_clave",
  "prestador_clave": "prestador_clave",
  "spst": "spst_nombre",
  "spst_nombre": "spst_nombre",
  "sub_prestador": "spst_nombre",
  "base": "spst_nombre",
  "empresa": "empresa_nombre",
  "empresa_nombre": "empresa_nombre",
  "sucursal": "sucursal_nombre",
  "sucursal_nombre": "sucursal_nombre",
  "domicilio": "domicilio_cliente",
  "domicilio_cliente": "domicilio_cliente",
  "localidad": "localidad_cliente",
  "localidad_cliente": "localidad_cliente",
  "kms": "kms_recorrido",
  "kms_recorrido": "kms_recorrido",
  "kms recorrido": "kms_recorrido",
  "nro_serie": "nro_serie",
  "nro serie": "nro_serie",
  "serie": "nro_serie",
  "umbral_viatico": "umbral_viatico",
  "umbral": "umbral_viatico",
  "url_maps": "url_maps",
  "maps": "url_maps",
  "google maps": "url_maps",
  "google_maps": "url_maps"
};

export default function TablaKMPage() {
  const [items, setItems] = useState<TablaKM[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [spsts, setSpsts] = useState<SPST[]>([]);
  const [filtroP, setFiltroP] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importStatus, setImportStatus] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [importando, setImportando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<number, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.getTablaKM(filtroP ? Number(filtroP) : undefined).then(setItems);

  useEffect(() => {
    api.getPrestadores().then(setPrestadores);
    api.getSPSTs().then(setSpsts);
    load();
  }, []);

  useEffect(() => {
    load();
  }, [filtroP]);

  const toggleCard = (id: number) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const spstsFiltrados = spsts.filter((s) => !form.prestador_id || s.prestador_id === Number(form.prestador_id));

  const handleSave = async () => {
    setError("");
    const payload = {
      prestador_id: Number(form.prestador_id),
      spst_id: form.spst_id ? Number(form.spst_id) : null,
      empresa_nombre: form.empresa_nombre,
      sucursal_nombre: form.sucursal_nombre,
      domicilio_cliente: form.domicilio_cliente || null,
      localidad_cliente: form.localidad_cliente || null,
      nro_serie: form.nro_serie || null,
      kms_recorrido: Number(form.kms_recorrido),
      umbral_viatico: Number(form.umbral_viatico),
      url_maps: form.url_maps || null,
    };
    try {
      if (editId) await api.updateTablaKM(editId, payload);
      else await api.createTablaKM(payload);
      setForm(EMPTY);
      setEditId(null);
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleEdit = (t: TablaKM) => {
    setEditId(t.id);
    setForm({
      prestador_id: String(t.prestador_id),
      spst_id: t.spst_id ? String(t.spst_id) : "",
      empresa_nombre: t.empresa_nombre,
      sucursal_nombre: t.sucursal_nombre,
      domicilio_cliente: t.domicilio_cliente || "",
      localidad_cliente: t.localidad_cliente || "",
      nro_serie: t.nro_serie || "",
      kms_recorrido: String(t.kms_recorrido),
      umbral_viatico: String(t.umbral_viatico),
      url_maps: t.url_maps || "",
    });
    setShowModal(true);
  };

  const handleAddKMForPrestador = (prestadorId: number) => {
    setEditId(null);
    setForm({
      ...EMPTY,
      prestador_id: String(prestadorId),
      umbral_viatico: "30"
    });
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditId(null);
    setForm({
      ...EMPTY,
      prestador_id: filtroP || (prestadores[0]?.id ? String(prestadores[0].id) : ""),
      umbral_viatico: "30"
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de kilómetros?")) {
      await api.deleteTablaKM(id);
      load();
    }
  };

  const handleExport = () => {
    const filteredItems = items.filter(
      (t) =>
        (!filtroP || t.prestador_id === Number(filtroP)) &&
        (!busqueda ||
          t.empresa_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          t.sucursal_nombre.toLowerCase().includes(busqueda.toLowerCase()))
    );

    exportToCSV(
      filteredItems.map((t) => {
        const spst = spsts.find((s) => s.id === t.spst_id);
        return {
          Sucursal: t.sucursal_nombre,
          Empresa: t.empresa_nombre,
          Domicilio: t.domicilio_cliente ?? "",
          Localidad: t.localidad_cliente ?? "",
          Base: spst?.nombre ?? "",
          "Kms recorrido": t.kms_recorrido,
          "Aplica viatico": t.aplica_viatico ? "Si" : "No",
          "Kms a facturar": t.kms_a_facturar,
          "Google Maps": t.url_maps ?? "",
        };
      }),
      filtroP
        ? `tabla_km_${prestadores.find((p) => String(p.id) === filtroP)?.nombre_corto ?? filtroP}.csv`
        : "tabla_km_todos.csv"
    );
  };

  const downloadTemplate = () => {
    const content = `sep=,
# ==============================================================================
# PLANTILLA DE IMPORTACION DE TABLA DE KILOMETROS (TABLA KM)
# ==============================================================================
# Instrucciones de llenado:
# - Copie y pegue directamente las columnas de su planilla Excel.
# - Asegurese de seleccionar el Prestador correcto en la pagina web antes de realizar la carga.
# - Base: Nombre de la base o sub-prestador (ej: PST SM Tucuman - Leonardo Herculano o General Pst 1287).
#   Si no se encuentra coincidencia exacta, se asignara a la base por defecto del prestador.
# - Kms recorrido: Distancia del trayecto (ej: 12.50 o 12,50).
# - Aplica viatico: Si/No (calculado automaticamente por el sistema).
# - Google Maps: (Opcional) Enlace de la ruta (ej: https://www.google.com/maps/...).
# ==============================================================================
Sucursal,Empresa,Domicilio,Localidad,Base,Kms recorrido,Aplica viatico,Kms a facturar,Google Maps
027 - GRID Shopping Portal Tucuman local 1002,AMX,Cariola 42 Yerba Buena local 1032,YERBA BUENA,General Pst 1287,12.5,Si,13,https://www.google.com/maps/...
`;
    downloadCSVTemplate(content, "plantilla_tabla_km.csv");
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

      const psts = await api.getPrestadores();
      const loadedSpsts = await api.getSPSTs();

      const pstMap = Object.fromEntries(psts.map((p: any) => [p.nombre_corto.toUpperCase(), p.id]));
      const spstMap: Record<string, number> = {};
      loadedSpsts.forEach((s: any) => {
        const key = `${s.prestador_id}::${s.nombre.toLowerCase().trim()}`;
        spstMap[key] = s.id;
      });

      const existing = await api.getTablaKM();
      const existingKeys = new Set(
        existing.map((t: any) => 
          `${t.prestador_id}-${t.empresa_nombre.trim().toLowerCase()}-${t.sucursal_nombre.trim().toLowerCase()}`
        )
      );

      let defaultPrestadorId: number | null = filtroP ? Number(filtroP) : null;
      let creados = 0;
      let omitidos = 0;
      let errores = 0;

      for (const row of rows) {
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([k, v]) => {
            const normKey = headerMappings[k.toLowerCase().trim()] || k;
            return [normKey, v];
          })
        );

        const clave = normalizedRow.prestador_clave?.trim().toUpperCase();
        let prestador_id = clave ? pstMap[clave] : defaultPrestadorId;

        // Fallback 1: If prestador_id is still unresolved, check if the Base (spst_nombre) matches a prestador's nombre_corto
        if (!prestador_id && normalizedRow.spst_nombre) {
          const baseUpper = normalizedRow.spst_nombre.trim().toUpperCase();
          if (pstMap[baseUpper]) {
            prestador_id = pstMap[baseUpper];
          }
        }

        // Fallback 2: Check if the Base (spst_nombre) matches an existing SPST name, and resolve prestador_id from it
        if (!prestador_id && normalizedRow.spst_nombre) {
          const spstNombreNorm = normalizedRow.spst_nombre.trim().toLowerCase();
          const matchedSpst = loadedSpsts.find((s: any) => 
            s.nombre.toLowerCase() === spstNombreNorm || 
            s.nombre.toLowerCase().includes(spstNombreNorm) || 
            spstNombreNorm.includes(s.nombre.toLowerCase())
          );
          if (matchedSpst) {
            prestador_id = matchedSpst.prestador_id;
          }
        }

        if (!prestador_id) {
          errores++;
          continue;
        }

        const empresa = normalizedRow.empresa_nombre?.trim();
        const sucursal = normalizedRow.sucursal_nombre?.trim();
        if (!empresa || !sucursal) {
          errores++;
          continue;
        }

        const rawKms = normalizedRow.kms_recorrido?.trim();
        if (!rawKms) {
          errores++;
          continue;
        }
        const kms = parseMoney(rawKms);

        let spst_id: number | null = null;
        const spstNombre = normalizedRow.spst_nombre?.trim().toLowerCase();
        if (spstNombre) {
          const spstKey = `${prestador_id}::${spstNombre}`;
          spst_id = spstMap[spstKey] || null;
          
          if (!spst_id) {
            const matchedSpst = loadedSpsts.find((s: any) => 
              s.prestador_id === prestador_id && 
              (s.nombre.toLowerCase().includes(spstNombre) || spstNombre.includes(s.nombre.toLowerCase()))
            );
            if (matchedSpst) {
              spst_id = matchedSpst.id;
            }
          }
        }

        if (!spst_id) {
          const defaultSpst = loadedSpsts.find((s: any) => 
            s.prestador_id === prestador_id && 
            s.nombre.toLowerCase().startsWith("pst ")
          );
          if (defaultSpst) {
            spst_id = defaultSpst.id;
          }
        }

        const key = `${prestador_id}-${empresa.toLowerCase()}-${sucursal.toLowerCase()}`;
        if (existingKeys.has(key)) {
          omitidos++;
          continue;
        }

        const umbral = parseFloat(normalizedRow.umbral_viatico || "30") || 30.0;
        const url_maps = normalizedRow.url_maps?.trim() || null;
        const nro_serie = normalizedRow.nro_serie?.trim() || null;
        const domicilio_cliente = normalizedRow.domicilio_cliente?.trim() || null;
        const localidad_cliente = normalizedRow.localidad_cliente?.trim() || null;

        try {
          await api.createTablaKM({
            prestador_id,
            spst_id,
            empresa_nombre: empresa,
            sucursal_nombre: sucursal,
            domicilio_cliente,
            localidad_cliente,
            nro_serie,
            kms_recorrido: kms,
            umbral_viatico: umbral,
            url_maps
          });
          creados++;
          existingKeys.add(key);
        } catch {
          errores++;
        }
      }

      setImportStatus({
        msg: `Importación completa: ${creados} registros de KM creados, ${omitidos} omitidos por existir, ${errores} errores.`,
        type: creados > 0 ? "ok" : "info"
      });
      load();
      api.getSPSTs().then(setSpsts);
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

  const filteredItems = items.filter(
    (t) =>
      (!filtroP || t.prestador_id === Number(filtroP)) &&
      (!busqueda ||
        t.empresa_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.sucursal_nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tabla KM</h2>
          <p className="text-sm text-slate-500 mt-1">
            KMs preacordados por par Empresa + Sucursal. Fuente de verdad para validación de kilómetros.
          </p>
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
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrada
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

      {/* Filters search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-inner">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Filtrar:</span>
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
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente o sucursal..."
            className="text-sm border border-slate-200 rounded-lg px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 shadow-sm flex-1 max-w-sm"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-full self-center sm:self-auto">
          {filteredItems.length} entradas en total
        </span>
      </div>

      {/* Prestadores Cards Container */}
      <div className="space-y-4">
        {prestadores
          .filter((p) => !filtroP || p.id === Number(filtroP))
          .map((p) => {
            const pstKms = filteredItems.filter((t) => t.prestador_id === p.id);
            const isExpanded = !!expandedCardIds[p.id];

            // If a search is active and there are no matching KM records, hide this prestador card.
            if (busqueda && pstKms.length === 0) {
              return null;
            }

            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Header card */}
                <div
                  onClick={() => toggleCard(p.id)}
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
                      <h3 className="text-lg font-bold text-slate-800 mt-1 flex items-center flex-wrap gap-2">
                        {p.nombre}
                        <span className="text-xs font-mono font-medium text-slate-400">
                          ({p.nombre_corto})
                        </span>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                          pstKms.length > 0 
                            ? "bg-slate-100 text-slate-600" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {pstKms.length > 0 ? `${pstKms.length} ${pstKms.length === 1 ? 'cliente' : 'clientes'}` : "Sin asignar"}
                        </span>
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddKMForPrestador(p.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Entrada
                  </button>
                </div>

                {/* Card content list */}
                {isExpanded && (
                  <div>
                    {pstKms.length === 0 ? (
                      <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50/30">
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Este prestador no tiene kilómetros asignados actualmente.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Configure los kilómetros recorridos de los clientes haciendo clic en el botón de agregar entrada.
                        </p>
                        <button
                          onClick={() => handleAddKMForPrestador(p.id)}
                          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Configurar KMs iniciales
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                              <th className="px-6 py-3 text-left">Empresa (Cliente)</th>
                              <th className="px-6 py-3 text-left">Sucursal</th>
                              <th className="px-6 py-3 text-left">SPST / Base</th>
                              <th className="px-6 py-3 text-left font-mono">Nro. Serie</th>
                              <th className="px-6 py-3 text-right">KMs Recorrido</th>
                              <th className="px-6 py-3 text-center">Aplica Viático</th>
                              <th className="px-6 py-3 text-right">KMs Facturar</th>
                              <th className="px-6 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pstKms.map((t) => {
                              const spst = spsts.find((s) => s.id === t.spst_id);
                              return (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-3.5">
                                    <div className="font-semibold text-slate-800">{t.empresa_nombre}</div>
                                    {t.domicilio_cliente && (
                                      <div className="text-xs text-slate-400 font-normal mt-0.5">{t.domicilio_cliente}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-slate-600">
                                    {t.url_maps ? (
                                      <a
                                        href={t.url_maps}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors group"
                                      >
                                        {t.sucursal_nombre}
                                        <MapPin className="w-3 h-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                                      </a>
                                    ) : (
                                      <div className="font-medium text-slate-700">{t.sucursal_nombre}</div>
                                    )}
                                    {t.localidad_cliente && (
                                      <div className="text-xs text-slate-400 font-normal mt-0.5">{t.localidad_cliente}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-slate-500 text-xs">{spst?.nombre ?? "—"}</td>
                                  <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{t.nro_serie ?? "—"}</td>
                                  <td className="px-6 py-3.5 text-right font-medium text-slate-700">{t.kms_recorrido} Kms</td>
                                  <td className="px-6 py-3.5 text-center">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                      t.aplica_viatico
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-50 text-slate-500 border border-slate-100"
                                    }`}>
                                      {t.aplica_viatico ? "Sí" : "No"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-bold text-slate-800">{t.kms_a_facturar} Kms</td>
                                  <td className="px-6 py-3.5 text-right space-x-3 whitespace-nowrap">
                                    <button
                                      onClick={() => handleEdit(t)}
                                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(t.id)}
                                      className="text-xs font-semibold text-rose-400 hover:text-rose-600 hover:underline"
                                    >
                                      Eliminar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Manual Entry and Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editId ? "Editar Entrada de KMs" : "Nueva Entrada de KMs"}
              </h3>
              <button
                onClick={() => {
                  setForm(EMPTY);
                  setEditId(null);
                  setShowModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="text-sm px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prestador *</label>
                <select
                  value={form.prestador_id}
                  onChange={(e) => setForm({ ...form, prestador_id: e.target.value, spst_id: "" })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecciona un prestador...</option>
                  {prestadores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_corto} ({p.nombre})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SPST (técnico/zona)</label>
                <select
                  value={form.spst_id}
                  onChange={(e) => setForm({ ...form, spst_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Sin asignar (usar nodo base)</option>
                  {spstsFiltrados.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Empresa (cliente) *</label>
                <input
                  value={form.empresa_nombre}
                  onChange={(e) => setForm({ ...form, empresa_nombre: e.target.value })}
                  placeholder="ej. YPF, 360 ENERGY..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sucursal *</label>
                <input
                  value={form.sucursal_nombre}
                  onChange={(e) => setForm({ ...form, sucursal_nombre: e.target.value })}
                  placeholder="ej. CAÑADA HONDA"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Domicilio del cliente</label>
                <input
                  value={form.domicilio_cliente}
                  onChange={(e) => setForm({ ...form, domicilio_cliente: e.target.value })}
                  placeholder="ej. Cariola 42 Yerba Buena..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Localidad del cliente</label>
                <input
                  value={form.localidad_cliente}
                  onChange={(e) => setForm({ ...form, localidad_cliente: e.target.value })}
                  placeholder="ej. YERBA BUENA"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nro. Serie / Filtro</label>
                <input
                  value={form.nro_serie}
                  onChange={(e) => setForm({ ...form, nro_serie: e.target.value })}
                  placeholder="Opcional"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">KMs recorrido *</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.kms_recorrido}
                  onChange={(e) => setForm({ ...form, kms_recorrido: e.target.value })}
                  placeholder="ej. 120.5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Umbral viático (km)</label>
                <input
                  type="number"
                  step="1"
                  value={form.umbral_viatico}
                  onChange={(e) => setForm({ ...form, umbral_viatico: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">URL Google Maps</label>
                <input
                  value={form.url_maps}
                  onChange={(e) => setForm({ ...form, url_maps: e.target.value })}
                  placeholder="ej. https://maps.google.com/..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <button
                onClick={() => {
                  setForm(EMPTY);
                  setEditId(null);
                  setShowModal(false);
                }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                {editId ? "Guardar cambios" : "Crear entrada"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
