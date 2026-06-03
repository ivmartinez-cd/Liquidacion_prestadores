from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.liquidacion import Liquidacion
from app.models.incidente import Incidente
from app.models.regla import ReglaAlerta


@dataclass
class ObservacionResult:
    """Resultado de evaluar_grupo(): describe una observación que puede agrupar múltiples incidentes."""
    tipo: str                            # RUTA_COMPARTIDA, KM_EXCEDIDO, etc.
    severidad: str                       # INFORMATIVO | ADVERTENCIA | CRITICO | AJUSTE_SUGERIDO
    titulo: str                          # Resumen legible para humanos
    descripcion: str                     # Detalle completo
    monto_cobrado: float
    monto_esperado: float
    incidentes_relacionados: List[int]   # IDs de incidentes del grupo
    incidente_principal_id: int          # El incidente con el problema central
    regla_codigo: str = ""
    contexto: dict = field(default_factory=dict)


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

    def evaluar_grupo(self, liquidacion: Liquidacion) -> List[ObservacionResult]:
        """Evalúa a nivel de liquidación y retorna observaciones que pueden agrupar múltiples incidentes.

        Los evaluadores que implementan lógica de grupo deben sobrescribir este método.
        """
        return []

    def _alerta(self, descripcion: str, contexto: dict = None) -> dict:
        return {
            "descripcion": descripcion,
            "riesgo": self.regla.riesgo_base,
            "contexto": contexto or {},
        }
