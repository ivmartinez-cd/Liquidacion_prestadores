from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class PrestadorBase(BaseModel):
    nombre: str
    nombre_corto: str
    cuit: Optional[str] = None
    region: Optional[str] = None
    activo: bool = True


class PrestadorCreate(PrestadorBase):
    pass


class PrestadorUpdate(BaseModel):
    nombre: Optional[str] = None
    nombre_corto: Optional[str] = None
    cuit: Optional[str] = None
    region: Optional[str] = None
    activo: Optional[bool] = None


class PrestadorResponse(PrestadorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
