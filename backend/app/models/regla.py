from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, func, JSON
from app.database import Base


class ReglaAlerta(Base):
    __tablename__ = "reglas_alerta"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(10), nullable=False, unique=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500))
    activa = Column(Boolean, default=True)
    riesgo_base = Column(Float, nullable=False)
    configuracion = Column(JSON, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
