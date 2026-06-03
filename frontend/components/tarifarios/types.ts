export interface Prestador {
  id: number;
  nombre: string;
  nombre_corto: string;
}

export interface Tarifario {
  id: number;
  prestador_id: number;
  tipo_servicio: string;
  zona: string | null;
  costo_servicio: number;
  costo_km: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

export interface GroupedService {
  tipo_servicio: string;
  zona: string | null;
  history: Tarifario[];
  active: Tarifario | null;
}
