from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional


class TarifarioBase(BaseModel):
    prestador_id: int
    tipo_servicio: str
    zona: Optional[str] = None
    costo_servicio: float
    costo_km: float
    vigencia_desde: date
    vigencia_hasta: Optional[date] = None


class TarifarioCreate(TarifarioBase):
    pass


class TarifarioUpdate(BaseModel):
    tipo_servicio: Optional[str] = None
    zona: Optional[str] = None
    costo_servicio: Optional[float] = None
    costo_km: Optional[float] = None
    vigencia_desde: Optional[date] = None
    vigencia_hasta: Optional[date] = None


class TarifarioResponse(TarifarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
