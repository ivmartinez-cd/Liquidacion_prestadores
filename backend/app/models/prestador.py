from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Prestador(Base):
    __tablename__ = "prestadores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    nombre_corto = Column(String(50), nullable=False, unique=True)
    cuit = Column(String(20))
    region = Column(String(100))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    spsts = relationship("SPST", back_populates="prestador", cascade="all, delete-orphan")
    tarifarios = relationship("Tarifario", back_populates="prestador", cascade="all, delete-orphan")
    tabla_kms = relationship("TablaKM", back_populates="prestador", cascade="all, delete-orphan")
    liquidaciones = relationship("Liquidacion", back_populates="prestador")
