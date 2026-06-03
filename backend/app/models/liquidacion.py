from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Liquidacion(Base):
    __tablename__ = "liquidaciones"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestadores.id"), nullable=False)
    numero_liquidacion = Column(String(20))
    periodo = Column(String(7), nullable=False)  # YYYY-MM
    tipo_liquidacion = Column(String(30), default="regular")  # regular | preco | cc | deposito
    nombre_archivo = Column(String(300))
    fecha_importacion = Column(DateTime, server_default=func.now())
    estado = Column(String(20), default="pendiente")  # pendiente | en_revision | aprobada | rechazada
    total_incidentes = Column(Integer, default=0)
    total_alertas = Column(Integer, default=0)
    total_importe = Column(Float, default=0.0)

    prestador = relationship("Prestador", back_populates="liquidaciones")
    incidentes = relationship("Incidente", back_populates="liquidacion", cascade="all, delete-orphan")
