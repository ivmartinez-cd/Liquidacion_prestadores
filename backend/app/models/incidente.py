from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base


class Incidente(Base):
    __tablename__ = "incidentes"

    id = Column(Integer, primary_key=True, index=True)
    liquidacion_id = Column(Integer, ForeignKey("liquidaciones.id"), nullable=False)
    numero_incidente = Column(String(20), nullable=False, index=True)
    rubro = Column(String(100))
    tipo = Column(String(50), nullable=False)
    empresa_nombre = Column(String(200))
    sucursal_nombre = Column(String(200))
    nro_serie = Column(String(100))
    fecha_cierre = Column(Date)

    # Valores cobrados (origen: CSV del prestador)
    costo_servicio_cobrado = Column(Float, default=0.0)
    cant_km_cobrado = Column(Float, default=0.0)
    costo_km_cobrado = Column(Float, default=0.0)
    total_viaje_cobrado = Column(Float, default=0.0)
    costo_total_cobrado = Column(Float, default=0.0)
    pasa_it = Column(Boolean, default=True)

    # Valores esperados (calculados por el motor al validar)
    costo_servicio_esperado = Column(Float)
    cant_km_esperado = Column(Float)
    costo_km_esperado = Column(Float)

    estado_validacion = Column(String(20), default="pendiente")  # pendiente | ok | con_alertas

    liquidacion = relationship("Liquidacion", back_populates="incidentes")
    alertas = relationship("Alerta", back_populates="incidente", cascade="all, delete-orphan")
