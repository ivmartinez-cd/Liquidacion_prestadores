from typing import List, Dict, Any
from app.models.incidente import Incidente
from app.models.tarifario import Tarifario
from app.models.tabla_km import TablaKM
from app.models.spst import SPST
from app.core.evaluadores.base import EvaluadorBase


class EvaluadorALT008(EvaluadorBase):
    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.fecha_cierre:
            return []

        # Buscar la zona del incidente a través de la sucursal en TablaKM -> SPST.zona
        zona_incidente = None
        tabla_km = (
            self.db.query(TablaKM)
            .filter(
                TablaKM.prestador_id == self.prestador_id,
                TablaKM.empresa_nombre == incidente.empresa_nombre,
                TablaKM.sucursal_nombre == incidente.sucursal_nombre,
            )
            .first()
        )
        if tabla_km and tabla_km.spst_id:
            spst = self.db.query(SPST).filter(SPST.id == tabla_km.spst_id).first()
            if spst:
                zona_incidente = spst.zona

        # Buscar tarifarios que correspondan a la zona específica o generales (zona == None)
        tarifarios = (
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
            .filter(
                (Tarifario.zona == zona_incidente)
                | (Tarifario.zona == None)
            )
            .all()
        )

        # Ordenar: priorizar tarifa con zona igual a la del incidente, luego por vigencia_desde desc
        def sort_key(t):
            matches_zone = (t.zona == zona_incidente) if zona_incidente else False
            return (1 if matches_zone else 0, t.vigencia_desde)

        tarifarios.sort(key=sort_key, reverse=True)
        tarifario = tarifarios[0] if tarifarios else None

        if not tarifario:
            return [self._alerta(
                f"Sin tarifario para tipo '{incidente.tipo}' en el período {incidente.fecha_cierre}",
                contexto={
                    "tipo_servicio": incidente.tipo,
                    "fecha_cierre": str(incidente.fecha_cierre),
                },
            )]
        return []
