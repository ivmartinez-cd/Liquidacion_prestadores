from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tarifario import Tarifario
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT001(EvaluadorBase):
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
            return []

        incidente.costo_servicio_esperado = tarifario.costo_servicio
        incidente.costo_km_esperado = tarifario.costo_km

        diferencia = abs((incidente.costo_servicio_cobrado or 0) - tarifario.costo_servicio)
        if diferencia > 0.01:
            return [self._alerta(
                f"Precio cobrado ${incidente.costo_servicio_cobrado:,.2f} difiere del tarifario "
                f"${tarifario.costo_servicio:,.2f} (diferencia: ${diferencia:,.2f})",
                contexto={
                    "cobrado": incidente.costo_servicio_cobrado,
                    "esperado": tarifario.costo_servicio,
                    "diferencia": round(diferencia, 2),
                    "tipo_servicio": incidente.tipo,
                },
            )]
        return []
