from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List


class IncidenteResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero_incidente: str
    tipo: str
    empresa_nombre: Optional[str]
    sucursal_nombre: Optional[str]
    nro_serie: Optional[str]
    fecha_cierre: Optional[date]
    costo_servicio_cobrado: float
    costo_servicio_esperado: Optional[float]
    cant_km_cobrado: float
    cant_km_esperado: Optional[float]
    costo_total_cobrado: float
    estado_validacion: str


class LiquidacionListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    prestador_id: int
    numero_liquidacion: Optional[str]
    periodo: str
    tipo_liquidacion: str
    nombre_archivo: Optional[str]
    fecha_importacion: datetime
    estado: str
    total_incidentes: int
    total_alertas: int
    total_importe: float


class LiquidacionResponse(LiquidacionListResponse):
    incidentes: List[IncidenteResumen] = []
