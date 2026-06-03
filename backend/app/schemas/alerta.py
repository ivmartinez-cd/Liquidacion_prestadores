from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List, Any


class IncidenteSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero_incidente: str
    tipo: str
    empresa_nombre: Optional[str]
    sucursal_nombre: Optional[str]
    nro_serie: Optional[str]
    fecha_cierre: Optional[date]
    costo_total_cobrado: float


class ResolucionCreate(BaseModel):
    decision: str
    justificacion: Optional[str] = None
    comentario: Optional[str] = None


class ResolucionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    decision: str
    justificacion: Optional[str]
    comentario: Optional[str]
    fecha: datetime


class AlertaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incidente_id: int
    liquidacion_id: int
    tipo_alerta: str
    descripcion: Optional[str]
    riesgo: float
    estado: str
    fecha_generacion: datetime
    datos_contexto: Optional[Any] = None


class AlertaDetailResponse(AlertaResponse):
    incidente: IncidenteSimple
    resoluciones: List[ResolucionResponse] = []
