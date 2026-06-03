from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tabla_km import TablaKM
from app.core.evaluadores.base import EvaluadorBase

# Must match UMBRAL_CORREDOR_KM in alt005_ruta.py
UMBRAL_CORREDOR_KM = 50


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
            # Suppress false positive when km=0 is intentional (shared route)
            if cobrado == 0 and esperado > 0 and self._es_ruta_compartida(incidente, tabla):
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

    def _es_ruta_compartida(self, incidente: Incidente, tabla: TablaKM) -> bool:
        """Return True if another same-day incident covers the km for this one.

        Checks both exact locality match (classic) and corridor match (same SPST,
        within UMBRAL_CORREDOR_KM), so that cases like Bigand/Bombal on the same
        route from the same SPST are correctly recognized as grouped.
        """
        base_q = (
            self.db.query(Incidente)
            .join(
                TablaKM,
                (TablaKM.prestador_id == self.prestador_id)
                & (TablaKM.empresa_nombre == Incidente.empresa_nombre)
                & (TablaKM.sucursal_nombre == Incidente.sucursal_nombre),
            )
            .filter(
                Incidente.liquidacion_id == incidente.liquidacion_id,
                Incidente.id != incidente.id,
                Incidente.fecha_cierre == incidente.fecha_cierre,
                Incidente.cant_km_cobrado > 0,
            )
        )

        # Exact locality match (original logic)
        if tabla.localidad_cliente and tabla.localidad_cliente.strip():
            if base_q.filter(
                TablaKM.localidad_cliente.ilike(tabla.localidad_cliente.strip())
            ).first():
                return True

        # Corridor match: same SPST + kms_recorrido within ±UMBRAL_CORREDOR_KM
        if tabla.spst_id:
            km = tabla.kms_recorrido
            if base_q.filter(
                TablaKM.spst_id == tabla.spst_id,
                TablaKM.kms_recorrido.between(km - UMBRAL_CORREDOR_KM, km + UMBRAL_CORREDOR_KM),
            ).first():
                return True

        return False

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
