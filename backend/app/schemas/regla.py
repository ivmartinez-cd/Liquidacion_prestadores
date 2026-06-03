from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any


class ReglaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    riesgo_base: Optional[float] = None
    configuracion: Optional[Any] = None


class ReglaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str]
    activa: bool
    riesgo_base: float
    configuracion: Any
    updated_at: datetime
