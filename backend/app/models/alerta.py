from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    incidente_id = Column(Integer, ForeignKey("incidentes.id"), nullable=False)
    liquidacion_id = Column(Integer, ForeignKey("liquidaciones.id"), nullable=False)
    tipo_alerta = Column(String(10), nullable=False)  # ALT001 .. ALT009
    descripcion = Column(String(500))
    datos_contexto = Column(JSON)
    riesgo = Column(Float, nullable=False)
    estado = Column(String(20), default="pendiente")  # pendiente | en_revision | resuelta | descartada
    fecha_generacion = Column(DateTime, server_default=func.now())

    incidente = relationship("Incidente", back_populates="alertas")
    liquidacion = relationship("Liquidacion")
    resoluciones = relationship("Resolucion", back_populates="alerta", cascade="all, delete-orphan")
