const API_URL = "http://localhost:8002";

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Dashboard
  getStats: () => fetchAPI("/dashboard/stats"),

  // Prestadores
  getPrestadores: () => fetchAPI("/prestadores/"),
  createPrestador: (d: unknown) =>
    fetchAPI("/prestadores/", { method: "POST", body: JSON.stringify(d) }),
  updatePrestador: (id: number, d: unknown) =>
    fetchAPI(`/prestadores/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deletePrestador: (id: number) =>
    fetchAPI(`/prestadores/${id}`, { method: "DELETE" }),

  // SPSTs
  getSPSTs: (prestadorId?: number) =>
    fetchAPI(`/spsts/${prestadorId ? `?prestador_id=${prestadorId}` : ""}`),
  createSPST: (d: unknown) =>
    fetchAPI("/spsts/", { method: "POST", body: JSON.stringify(d) }),
  updateSPST: (id: number, d: unknown) =>
    fetchAPI(`/spsts/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteSPST: (id: number) =>
    fetchAPI(`/spsts/${id}`, { method: "DELETE" }),

  // Tarifarios
  getTarifarios: (prestadorId?: number) =>
    fetchAPI(`/tarifarios/${prestadorId ? `?prestador_id=${prestadorId}` : ""}`),
  createTarifario: (d: unknown) =>
    fetchAPI("/tarifarios/", { method: "POST", body: JSON.stringify(d) }),
  updateTarifario: (id: number, d: unknown) =>
    fetchAPI(`/tarifarios/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteTarifario: (id: number) =>
    fetchAPI(`/tarifarios/${id}`, { method: "DELETE" }),

  // Tabla KM
  getTablaKM: (prestadorId?: number, empresa?: string) => {
    const params = new URLSearchParams();
    if (prestadorId) params.set("prestador_id", String(prestadorId));
    if (empresa) params.set("empresa", empresa);
    return fetchAPI(`/tabla-km/?${params}`);
  },
  createTablaKM: (d: unknown) =>
    fetchAPI("/tabla-km/", { method: "POST", body: JSON.stringify(d) }),
  updateTablaKM: (id: number, d: unknown) =>
    fetchAPI(`/tabla-km/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteTablaKM: (id: number) =>
    fetchAPI(`/tabla-km/${id}`, { method: "DELETE" }),
  importarExcelPrestador: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_URL}/prestadores/importar-excel`, { method: "POST", body: fd }).then((r) =>
      r.json()
    );
  },

  // Tabla KM
  plantillaTablaKMUrl: `${API_URL}/tabla-km/plantilla`,
  importarExcelTablaKM: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_URL}/tabla-km/importar-excel`, { method: "POST", body: fd }).then((r) =>
      r.json()
    );
  },

  // Tarifarios
  plantillaTarifariosUrl: `${API_URL}/tarifarios/plantilla`,
  importarExcelTarifarios: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_URL}/tarifarios/importar-excel`, { method: "POST", body: fd }).then((r) =>
      r.json()
    );
  },

  // Liquidaciones
  getLiquidaciones: (prestadorId?: number) =>
    fetchAPI(`/liquidaciones/${prestadorId ? `?prestador_id=${prestadorId}` : ""}`),
  getLiquidacion: (id: number) => fetchAPI(`/liquidaciones/${id}`),
  importarLiquidacion: (formData: FormData) =>
    fetch(`${API_URL}/liquidaciones/importar`, { method: "POST", body: formData }).then((r) =>
      r.json()
    ),
  reanalizar: (id: number) =>
    fetchAPI(`/liquidaciones/${id}/reanalize`, { method: "POST" }),
  cambiarEstado: (id: number, estado: string) =>
    fetchAPI(`/liquidaciones/${id}/estado?estado=${estado}`, { method: "PUT" }),
  deleteLiquidacion: (id: number) =>
    fetchAPI(`/liquidaciones/${id}`, { method: "DELETE" }),
  cambiarEstadoObservacion: (liqId: number, obsId: number, estado: string) =>
    fetchAPI(`/liquidaciones/${liqId}/observaciones/${obsId}/estado?estado=${encodeURIComponent(estado)}`, { method: "PUT" }),
};
