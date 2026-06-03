from pydantic import BaseModel, ConfigDict
from typing import Optional


class SPSTBase(BaseModel):
    prestador_id: int
    nombre: str
    domicilio: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    zona: Optional[str] = None
    activo: bool = True


class SPSTCreate(SPSTBase):
    pass


class SPSTUpdate(BaseModel):
    nombre: Optional[str] = None
    domicilio: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    zona: Optional[str] = None
    activo: Optional[bool] = None


class SPSTResponse(SPSTBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
