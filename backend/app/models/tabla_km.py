from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class TablaKM(Base):
    __tablename__ = "tabla_kms"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestadores.id"), nullable=False)
    spst_id = Column(Integer, ForeignKey("spsts.id"), nullable=True)
    empresa_nombre = Column(String(200), nullable=False)
    sucursal_nombre = Column(String(200), nullable=False)
    nro_serie = Column(String(100))  # lookup para escuelas San Juan
    domicilio_cliente = Column(String(300))
    localidad_cliente = Column(String(100))
    provincia_cliente = Column(String(100))
    kms_recorrido = Column(Float, nullable=False)
    umbral_viatico = Column(Float, default=30.0)  # configurable por excepción (ej: 20 para Aerop. SF)
    aplica_viatico = Column(Boolean, default=False)
    kms_a_facturar = Column(Float, default=0.0)
    url_maps = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    prestador = relationship("Prestador", back_populates="tabla_kms")
    spst = relationship("SPST", back_populates="tabla_kms")
