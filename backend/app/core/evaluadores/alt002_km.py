from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tabla_km import TablaKM
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT002(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        tabla = self._find_tabla(incidente)
        if not tabla:
            return []

        incidente.cant_km_esperado = tabla.kms_a_facturar

        cobrado = incidente.cant_km_cobrado or 0
        esperado = tabla.kms_a_facturar

        config = self.regla.configuracion or {}
        tolerancia = config.get("tolerancia_km", 0.5)

        if abs(cobrado - esperado) > tolerancia:
            return [self._alerta(
                f"KMs cobrados {cobrado} km difieren de la Tabla KM ({esperado} km) "
                f"para {incidente.empresa_nombre} — {incidente.sucursal_nombre}",
                contexto={
                    "cobrado": cobrado,
                    "esperado": esperado,
                    "diferencia": round(abs(cobrado - esperado), 2),
                    "empresa": incidente.empresa_nombre,
                    "sucursal": incidente.sucursal_nombre,
                },
            )]
        return []

    def _find_tabla(self, incidente: Incidente):
        return (
            self.db.query(TablaKM)
            .filter(
                TablaKM.prestador_id == self.prestador_id,
                TablaKM.empresa_nombre.ilike(incidente.empresa_nombre or ""),
                TablaKM.sucursal_nombre.ilike(incidente.sucursal_nombre or ""),
            )
            .first()
        )
