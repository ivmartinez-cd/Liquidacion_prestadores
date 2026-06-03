from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Observacion(Base):
    __tablename__ = "observaciones"

    id = Column(Integer, primary_key=True, index=True)
    liquidacion_id = Column(Integer, ForeignKey("liquidaciones.id"), nullable=False)
    tipo_observacion = Column(String(30), nullable=False)
    severidad = Column(String(20), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(String(1000))
    datos_contexto = Column(JSON, default={})
    monto_cobrado = Column(Float, default=0.0)
    monto_esperado = Column(Float, default=0.0)
    diferencia = Column(Float, default=0.0)
    estado = Column(String(30), default="pendiente")
    regla_codigo = Column(String(10))
    fecha_generacion = Column(DateTime, server_default=func.now())

    liquidacion = relationship("Liquidacion", back_populates="observaciones")
    incidentes = relationship(
        "ObservacionIncidente",
        back_populates="observacion",
        cascade="all, delete-orphan",
    )


class ObservacionIncidente(Base):
    """Tabla de unión N:M entre Observacion e Incidente, con rol semántico."""

    __tablename__ = "observacion_incidentes"

    id = Column(Integer, primary_key=True, index=True)
    observacion_id = Column(Integer, ForeignKey("observaciones.id"), nullable=False)
    incidente_id = Column(Integer, ForeignKey("incidentes.id"), nullable=False)
    # "principal" = el que tiene el error central, "referencia" = los relacionados
    rol = Column(String(30), default="referencia")

    observacion = relationship("Observacion", back_populates="incidentes")
    incidente = relationship("Incidente")
