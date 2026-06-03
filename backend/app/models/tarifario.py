from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Tarifario(Base):
    __tablename__ = "tarifarios"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestadores.id"), nullable=False)
    # correctivo | preventivo | instalacion_desinstalacion | pre_correctivo | guardia | sistemas
    tipo_servicio = Column(String(50), nullable=False)
    # None = aplica a toda la zona del PST; "Villa Mercedes", "Gral Roca" para INFOMAC
    zona = Column(String(100))
    costo_servicio = Column(Float, nullable=False)
    costo_km = Column(Float, nullable=False)
    vigencia_desde = Column(Date, nullable=False)
    vigencia_hasta = Column(Date)
    created_at = Column(DateTime, server_default=func.now())

    prestador = relationship("Prestador", back_populates="tarifarios")
