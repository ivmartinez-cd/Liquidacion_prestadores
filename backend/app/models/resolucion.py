from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Resolucion(Base):
    __tablename__ = "resoluciones"

    id = Column(Integer, primary_key=True, index=True)
    alerta_id = Column(Integer, ForeignKey("alertas.id"), nullable=False)
    decision = Column(String(50), nullable=False)  # aprobar | solicitar_correccion | ignorar | escalar
    justificacion = Column(String(200))
    comentario = Column(Text)
    fecha = Column(DateTime, server_default=func.now())

    alerta = relationship("Alerta", back_populates="resoluciones")
