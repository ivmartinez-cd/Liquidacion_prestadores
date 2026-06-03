from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.liquidacion import Liquidacion
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT004(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        duplicados = (
            self.db.query(Incidente)
            .join(Liquidacion)
            .filter(
                Liquidacion.prestador_id == self.prestador_id,
                Incidente.id != incidente.id,
                Incidente.numero_incidente == incidente.numero_incidente,
            )
            .all()
        )

        if duplicados:
            liq_ids = list({i.liquidacion_id for i in duplicados})
            return [self._alerta(
                f"Incidente #{incidente.numero_incidente} ya fue liquidado en "
                f"{len(duplicados)} liquidación(es) anterior(es)",
                contexto={
                    "numero_incidente": incidente.numero_incidente,
                    "liquidaciones_previas": liq_ids,
                },
            )]
        return []
