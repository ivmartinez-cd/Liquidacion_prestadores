from typing import List, Dict, Any
from datetime import timedelta
from app.models.incidente import Incidente
from app.models.liquidacion import Liquidacion
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT003(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.cant_km_cobrado or incidente.cant_km_cobrado == 0:
            return []
        if not incidente.fecha_cierre:
            return []

        config = self.regla.configuracion or {}
        ventana_dias = config.get("ventana_dias", 30)

        fecha_desde = incidente.fecha_cierre - timedelta(days=ventana_dias)
        fecha_hasta = incidente.fecha_cierre + timedelta(days=ventana_dias)

        similares = (
            self.db.query(Incidente)
            .join(Liquidacion)
            .filter(
                Liquidacion.prestador_id == self.prestador_id,
                Incidente.id != incidente.id,
                Incidente.empresa_nombre.ilike(incidente.empresa_nombre or ""),
                Incidente.sucursal_nombre.ilike(incidente.sucursal_nombre or ""),
                Incidente.cant_km_cobrado > 0,
                Incidente.fecha_cierre >= fecha_desde,
                Incidente.fecha_cierre <= fecha_hasta,
            )
            .all()
        )

        if similares:
            refs = [f"#{i.numero_incidente} ({i.fecha_cierre})" for i in similares[:3]]
            return [self._alerta(
                f"Posible viático duplicado: {len(similares)} incidente(s) con KMs en la misma "
                f"sucursal dentro de {ventana_dias} días: {', '.join(refs)}",
                contexto={
                    "incidentes_similares": [i.numero_incidente for i in similares],
                    "empresa": incidente.empresa_nombre,
                    "sucursal": incidente.sucursal_nombre,
                    "ventana_dias": ventana_dias,
                },
            )]
        return []
