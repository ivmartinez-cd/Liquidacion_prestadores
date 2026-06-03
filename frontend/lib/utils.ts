export function clsRiesgo(riesgo: number): string {
  if (riesgo >= 150) return "bg-red-100 text-red-800 border-red-200";
  if (riesgo >= 100) return "bg-orange-100 text-orange-800 border-orange-200";
  if (riesgo >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-green-100 text-green-800 border-green-200";
}

export function labelRiesgo(riesgo: number): string {
  if (riesgo >= 150) return "Crítico";
  if (riesgo >= 100) return "Alto";
  if (riesgo >= 50) return "Medio";
  return "Bajo";
}

export function clsEstadoAlerta(estado: string): string {
  const map: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    en_revision: "bg-blue-100 text-blue-800",
    resuelta: "bg-green-100 text-green-800",
    descartada: "bg-gray-100 text-gray-600",
  };
  return map[estado] ?? "bg-gray-100 text-gray-600";
}

export function clsEstadoLiquidacion(estado: string): string {
  const map: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    en_revision: "bg-blue-100 text-blue-800",
    aprobada: "bg-green-100 text-green-800",
    rechazada: "bg-red-100 text-red-800",
  };
  return map[estado] ?? "bg-gray-100 text-gray-600";
}

export function formatMonto(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatFecha(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-AR");
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { result.push(cur); cur = ""; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^﻿/, ""));
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

export const TIPO_ALERTA_LABEL: Record<string, string> = {
  ALT001: "Precio Incorrecto",
  ALT002: "KMs Incorrectos",
  ALT003: "Viático Duplicado",
  ALT004: "Servicio Duplicado",
  ALT005: "Ruta Compartida",
  ALT006: "Segunda Visita",
  ALT007: "Agrupación",
  ALT008: "Sin Tarifario",
  ALT009: "Sin Tabla KM",
};
