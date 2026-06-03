from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tabla_km import TablaKM
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT005(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.fecha_cierre:
            return []

        # Find current incident sucursal details in TablaKM
        tabla = (
            self.db.query(TablaKM)
            .filter(
                TablaKM.prestador_id == self.prestador_id,
                TablaKM.empresa_nombre.ilike(incidente.empresa_nombre or ""),
                TablaKM.sucursal_nombre.ilike(incidente.sucursal_nombre or ""),
            )
            .first()
        )
        if not tabla:
            return []

        current_localidad = tabla.localidad_cliente
        current_spst_id = tabla.spst_id

        # Find other same-day incidents in the same locality or SPST zone
        similares = (
            self.db.query(Incidente)
            .join(TablaKM, (TablaKM.prestador_id == self.prestador_id) & 
                           (TablaKM.empresa_nombre == Incidente.empresa_nombre) & 
                           (TablaKM.sucursal_nombre == Incidente.sucursal_nombre))
            .filter(
                Incidente.liquidacion_id == incidente.liquidacion_id,
                Incidente.id != incidente.id,
                Incidente.fecha_cierre == incidente.fecha_cierre,
            )
            .filter(
                (TablaKM.localidad_cliente == current_localidad) |
                (TablaKM.spst_id == current_spst_id)
            )
            .all()
        )

        if not similares:
            return []

        # We have a shared route!
        # Case A: Both charged KMs > 0 (Duplicate viático error)
        cobrado = incidente.cant_km_cobrado or 0
        
        if cobrado > 0:
            duplicates = [i for i in similares if (i.cant_km_cobrado or 0) > 0]
            if duplicates:
                refs = [f"#{i.numero_incidente} ({i.cant_km_cobrado} km)" for i in duplicates]
                return [self._alerta(
                    f"Ruta compartida con KMs cobrados duplicados: se cobraron {cobrado} km "
                    f"en este incidente y también en: {', '.join(refs)} en la misma fecha y localidad.",
                    contexto={
                        "tipo": "duplicado",
                        "cobrado_este": cobrado,
                        "otros_incidentes": [i.numero_incidente for i in duplicates],
                        "localidad": current_localidad,
                    }
                )]
        
        # Case B: Shared route correctly grouped (Informational)
        elif cobrado == 0:
            incident_with_km = next((i for i in similares if (i.cant_km_cobrado or 0) > 0), None)
            if incident_with_km:
                return [self._alerta(
                    f"Ruta compartida detectada correctamente: agrupado con incidente "
                    f"#{incident_with_km.numero_incidente} ({incident_with_km.cant_km_cobrado} km) "
                    f"en la misma localidad el mismo día.",
                    contexto={
                        "tipo": "agrupado_ok",
                        "incidente_principal": incident_with_km.numero_incidente,
                        "kms_principal": incident_with_km.cant_km_cobrado,
                        "localidad": current_localidad,
                    }
                )]

        return []
