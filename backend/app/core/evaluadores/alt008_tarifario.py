from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tarifario import Tarifario
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT008(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.fecha_cierre:
            return []

        tarifario = (
            self.db.query(Tarifario)
            .filter(
                Tarifario.prestador_id == self.prestador_id,
                Tarifario.tipo_servicio == incidente.tipo,
                Tarifario.vigencia_desde <= incidente.fecha_cierre,
            )
            .filter(
                (Tarifario.vigencia_hasta == None)
                | (Tarifario.vigencia_hasta >= incidente.fecha_cierre)
            )
            .first()
        )

        if not tarifario:
            return [self._alerta(
                f"Sin tarifario para tipo '{incidente.tipo}' en el período {incidente.fecha_cierre}",
                contexto={
                    "tipo_servicio": incidente.tipo,
                    "fecha_cierre": str(incidente.fecha_cierre),
                },
            )]
        return []
