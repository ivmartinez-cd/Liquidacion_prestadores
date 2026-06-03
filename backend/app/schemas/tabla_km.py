from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TablaKMBase(BaseModel):
    prestador_id: int
    spst_id: Optional[int] = None
    empresa_nombre: str
    sucursal_nombre: str
    nro_serie: Optional[str] = None
    domicilio_cliente: Optional[str] = None
    localidad_cliente: Optional[str] = None
    provincia_cliente: Optional[str] = None
    kms_recorrido: float
    umbral_viatico: float = 30.0
    aplica_viatico: bool = False
    kms_a_facturar: float = 0.0
    url_maps: Optional[str] = None


class TablaKMCreate(TablaKMBase):
    pass


class TablaKMUpdate(BaseModel):
    spst_id: Optional[int] = None
    empresa_nombre: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    nro_serie: Optional[str] = None
    kms_recorrido: Optional[float] = None
    umbral_viatico: Optional[float] = None
    aplica_viatico: Optional[bool] = None
    kms_a_facturar: Optional[float] = None
    url_maps: Optional[str] = None


class TablaKMResponse(TablaKMBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
