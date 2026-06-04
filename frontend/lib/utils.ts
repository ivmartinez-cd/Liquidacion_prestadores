export function clsEstadoLiquidacion(estado: string): string {
  const map: Record<string, string> = {
    abierta: "bg-blue-100 text-blue-800",
    preliquidada: "bg-purple-100 text-purple-800",
    recibida: "bg-indigo-100 text-indigo-800",
    observada: "bg-amber-100 text-amber-800",
    aprobada: "bg-green-100 text-green-800",
    cerrada: "bg-gray-100 text-gray-800",
    pendiente: "bg-yellow-100 text-yellow-800",
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

function parseCSVLine(line: string, separator: string = ","): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === separator && !inQ) { result.push(cur); cur = ""; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

export function parseCSV(text: string): Record<string, string>[] {
  let lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  
  // Skip Excel separator declaration line if present (e.g. sep=,)
  if (lines.length > 0 && lines[0].toLowerCase().startsWith("sep=")) {
    lines = lines.slice(1);
  }
  
  // Filter out any commented instruction lines (starting with #, even if quoted)
  lines = lines.filter((l) => !/^["]*#/.test(l.trim()));

  if (lines.length < 2) return [];

  // Detect separator: comma (,) or semicolon (;) based on count in header line
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ";" : ",";

  const headers = parseCSVLine(lines[0], separator).map((h) => h.trim().replace(/^﻿/, ""));
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line, separator);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

export function downloadCSVTemplate(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


