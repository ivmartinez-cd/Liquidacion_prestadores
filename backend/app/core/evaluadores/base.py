from abc import ABC, abstractmethod
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.liquidacion import Liquidacion
from app.models.incidente import Incidente
from app.models.regla import ReglaAlerta


class EvaluadorBase(ABC):
    def __init__(self, db: Session, liquidacion: Liquidacion, regla: ReglaAlerta):
        self.db = db
        self.liquidacion = liquidacion
        self.regla = regla
        self.prestador_id = liquidacion.prestador_id

    @abstractmethod
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        """Retorna lista de dicts con keys: descripcion, riesgo, contexto."""
        pass

    def _alerta(self, descripcion: str, contexto: dict = None) -> dict:
        return {
            "descripcion": descripcion,
            "riesgo": self.regla.riesgo_base,
            "contexto": contexto or {},
        }
