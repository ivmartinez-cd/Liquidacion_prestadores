from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List, Any
from app.schemas.alerta import AlertaResponse


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
    alertas: List[AlertaResponse] = []
    localidad_cliente: Optional[str] = None
    spst_id: Optional[int] = None


class ObservacionIncidenteResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    incidente_id: int
    rol: str


class ObservacionResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo_observacion: str
    severidad: str
    titulo: str
    descripcion: Optional[str]
    datos_contexto: Optional[Any]
    monto_cobrado: float
    monto_esperado: float
    diferencia: float
    estado: str
    regla_codigo: Optional[str]
    fecha_generacion: datetime
    incidentes: List[ObservacionIncidenteResumen] = []


class LiquidacionListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    prestador_id: int
    prestador_nombre: Optional[str] = None
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
    observaciones: List[ObservacionResumen] = []
