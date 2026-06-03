from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tabla_km import TablaKM
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT009(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.empresa_nombre or not incidente.sucursal_nombre:
            return []
        if not incidente.cant_km_cobrado:
            return []

        tabla = (
            self.db.query(TablaKM)
            .filter(
                TablaKM.prestador_id == self.prestador_id,
                TablaKM.empresa_nombre.ilike(incidente.empresa_nombre),
                TablaKM.sucursal_nombre.ilike(incidente.sucursal_nombre),
            )
            .first()
        )

        if not tabla:
            return [self._alerta(
                f"Par Empresa+Sucursal no encontrado en Tabla KM: "
                f"'{incidente.empresa_nombre}' — '{incidente.sucursal_nombre}'",
                contexto={
                    "empresa": incidente.empresa_nombre,
                    "sucursal": incidente.sucursal_nombre,
                },
            )]
        return []
