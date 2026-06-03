from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class SPST(Base):
    __tablename__ = "spsts"

    id = Column(Integer, primary_key=True, index=True)
    prestador_id = Column(Integer, ForeignKey("prestadores.id"), nullable=False)
    nombre = Column(String(200), nullable=False)
    domicilio = Column(String(300))
    localidad = Column(String(100))
    provincia = Column(String(100))
    zona = Column(String(100))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    prestador = relationship("Prestador", back_populates="spsts")
    tabla_kms = relationship("TablaKM", back_populates="spst")
