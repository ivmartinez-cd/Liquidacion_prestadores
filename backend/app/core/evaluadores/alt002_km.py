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
            # Check if this is a shared route where KMs were charged in another incident
            if cobrado == 0 and esperado > 0:
                current_localidad = tabla.localidad_cliente
                
                if current_localidad and current_localidad.strip():
                    # Check same-day incidents in same locality with KMs cobrados > 0
                    other_incidents_with_km = (
                        self.db.query(Incidente)
                        .join(TablaKM, (TablaKM.prestador_id == self.prestador_id) & 
                                       (TablaKM.empresa_nombre == Incidente.empresa_nombre) & 
                                       (TablaKM.sucursal_nombre == Incidente.sucursal_nombre))
                        .filter(
                            Incidente.liquidacion_id == incidente.liquidacion_id,
                            Incidente.id != incidente.id,
                            Incidente.fecha_cierre == incidente.fecha_cierre,
                            Incidente.cant_km_cobrado > 0,
                            TablaKM.localidad_cliente.ilike(current_localidad.strip()),
                        )
                        .first()
                    )
                    if other_incidents_with_km:
                        # Correctly shared route, suppress KMs Incorrectos alert
                        return []

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
