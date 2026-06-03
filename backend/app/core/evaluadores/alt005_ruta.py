from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple
from app.models.incidente import Incidente
from app.models.liquidacion import Liquidacion
from app.models.tabla_km import TablaKM
from app.core.evaluadores.base import EvaluadorBase, ObservacionResult

# Margin in km to consider two destinations on the same route corridor from the same SPST.
# Bigand (146 km) + Bombal (177 km): difference = 31 km → within threshold → corridor match.
UMBRAL_CORREDOR_KM = 50


class EvaluadorALT005(EvaluadorBase):

    # ------------------------------------------------------------------
    # evaluar_grupo: análisis a nivel de liquidación (nueva interfaz)
    # ------------------------------------------------------------------

    def evaluar_grupo(self, liquidacion: Liquidacion) -> List[ObservacionResult]:
        """Agrupa incidentes en corredores y genera una ObservacionResult por grupo."""
        observaciones = []
        procesados: set = set()

        # Cargar tabla_km para cada incidente en memoria
        inc_tablas: Dict[int, TablaKM] = {}
        for inc in liquidacion.incidentes:
            t = self._find_tabla_km(inc)
            if t:
                inc_tablas[inc.id] = t

        # Agrupar incidentes por fecha de cierre
        por_dia: Dict = defaultdict(list)
        for inc in liquidacion.incidentes:
            if inc.fecha_cierre and inc.id in inc_tablas:
                # La ruta compartida es solo si hay viatico y los km no son 0
                if (inc.cant_km_cobrado or 0) > 0:
                    por_dia[inc.fecha_cierre].append(inc)

        for _fecha, incs_dia in por_dia.items():
            for inc in incs_dia:
                if inc.id in procesados:
                    continue

                tabla_actual = inc_tablas[inc.id]
                if not tabla_actual.spst_id and not tabla_actual.localidad_cliente:
                    continue

                # Construir grupo: incidentes en el mismo corredor
                grupo = [inc]
                for otro in incs_dia:
                    if otro.id == inc.id or otro.id in procesados:
                        continue
                    tabla_otro = inc_tablas.get(otro.id)
                    if not tabla_otro:
                        continue
                    if self._mismo_corredor(tabla_actual, tabla_otro):
                        grupo.append(otro)

                if len(grupo) < 2:
                    continue

                for g in grupo:
                    procesados.add(g.id)

                obs = self._crear_observacion(grupo, inc_tablas)
                if obs:
                    observaciones.append(obs)

        return observaciones

    # ------------------------------------------------------------------
    # evaluar: análisis por incidente (interfaz original, backward compat)
    # ------------------------------------------------------------------

    def evaluar(self, incidente: Incidente) -> List[Dict[str, Any]]:
        if not incidente.fecha_cierre:
            return []

        # La ruta compartida es solo si hay viatico y los km no son 0
        if not incidente.cant_km_cobrado or incidente.cant_km_cobrado == 0:
            return []

        tabla_actual = self._find_tabla_km(incidente)
        if not tabla_actual:
            return []

        exactos, corredor = self._buscar_candidatos(incidente, tabla_actual)
        if not exactos and not corredor:
            return []

        cobrado = incidente.cant_km_cobrado or 0
        alertas = []

        if exactos:
            alertas += self._alertas_exactos(incidente, cobrado, exactos, tabla_actual.localidad_cliente)

        if corredor:
            alertas += self._alertas_corredor(cobrado, corredor, tabla_actual)

        return alertas

    # ------------------------------------------------------------------
    # Helpers compartidos
    # ------------------------------------------------------------------

    def _find_tabla_km(self, incidente: Incidente) -> Optional[TablaKM]:
        return (
            self.db.query(TablaKM)
            .filter(
                TablaKM.prestador_id == self.prestador_id,
                TablaKM.empresa_nombre.ilike(incidente.empresa_nombre or ""),
                TablaKM.sucursal_nombre.ilike(incidente.sucursal_nombre or ""),
            )
            .first()
        )

    def _mismo_corredor(self, t1: TablaKM, t2: TablaKM) -> bool:
        """True si dos entradas de TablaKM están en el mismo corredor geográfico."""
        # Localidad exacta
        if (t1.localidad_cliente and t2.localidad_cliente
                and t1.localidad_cliente.strip().lower() == t2.localidad_cliente.strip().lower()):
            return True
        # Corredor: mismo SPST + km dentro del umbral
        if (t1.spst_id and t2.spst_id == t1.spst_id
                and t1.kms_recorrido is not None and t2.kms_recorrido is not None
                and abs(t1.kms_recorrido - t2.kms_recorrido) <= UMBRAL_CORREDOR_KM):
            return True
        return False

    def _crear_observacion(
        self, grupo: List[Incidente], inc_tablas: Dict[int, TablaKM]
    ) -> Optional[ObservacionResult]:
        km_totales = sum(g.cant_km_cobrado or 0 for g in grupo)
        km_max_tabla = max(
            (inc_tablas[g.id].kms_recorrido or 0) for g in grupo if g.id in inc_tablas
        )
        diferencia_km = km_totales - km_max_tabla

        monto_cobrado_total = sum(g.costo_total_cobrado or 0 for g in grupo)
        incidente_principal = max(grupo, key=lambda g: g.cant_km_cobrado or 0)
        empresa = grupo[0].empresa_nombre or "?"
        fecha_str = str(grupo[0].fecha_cierre)

        localidades = [
            (inc_tablas[g.id].localidad_cliente if g.id in inc_tablas else None)
            or g.sucursal_nombre or "?"
            for g in grupo
        ]

        # Calcular costo unitario de km desde el incidente principal
        principal = incidente_principal
        if (principal.cant_km_cobrado or 0) > 0:
            costo_km_unit = (principal.total_viaje_cobrado or 0) / principal.cant_km_cobrado
        else:
            costo_km_unit = principal.costo_km_cobrado or 0

        # Determinar severidad
        if km_totales == 0:
            severidad = "INFORMATIVO"
            titulo = f"Ruta compartida correctamente agrupada — {len(grupo)} incidentes"
            diferencia_monto = 0.0
            monto_esperado_total = monto_cobrado_total
        elif diferencia_km > 0:
            diferencia_monto = round(diferencia_km * costo_km_unit, 2)
            monto_esperado_total = round(monto_cobrado_total - diferencia_monto, 2)
            severidad = "CRITICO"
            titulo = f"KMs duplicados en corredor — ${diferencia_monto:,.2f} cobrado en exceso"
        else:
            severidad = "ADVERTENCIA"
            titulo = f"Posible ruta compartida — revisar {len(grupo)} incidentes"
            diferencia_monto = 0.0
            monto_esperado_total = monto_cobrado_total

        # Rol: el incidente con más km es el principal; el resto son referencias
        roles = {g.id: "referencia" for g in grupo}
        roles[incidente_principal.id] = "principal"

        return ObservacionResult(
            tipo="RUTA_COMPARTIDA",
            severidad=severidad,
            titulo=titulo,
            descripcion=(
                f"{len(grupo)} incidentes de {empresa} el {fecha_str} "
                f"en corredor ({', '.join(localidades)}). "
                f"KMs cobrados total: {km_totales} | KMs máx. corredor (tabla): {km_max_tabla}."
            ),
            monto_cobrado=monto_cobrado_total,
            monto_esperado=monto_esperado_total,
            incidentes_relacionados=[g.id for g in grupo],
            incidente_principal_id=incidente_principal.id,
            regla_codigo="ALT005",
            contexto={
                "localidades": localidades,
                "km_individuales": {g.numero_incidente: g.cant_km_cobrado or 0 for g in grupo},
                "km_maximo_corredor_tabla": km_max_tabla,
                "diferencia_km": round(diferencia_km, 2),
                "roles": {g.numero_incidente: roles[g.id] for g in grupo},
            },
        )

    # ------------------------------------------------------------------
    # Helpers legados (evaluar por incidente)
    # ------------------------------------------------------------------

    def _base_query(self, incidente: Incidente):
        return (
            self.db.query(Incidente, TablaKM)
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
            )
        )

    def _buscar_candidatos(
        self, incidente: Incidente, tabla_actual: TablaKM
    ) -> Tuple[List, List]:
        base_q = self._base_query(incidente)

        exactos = []
        if tabla_actual.localidad_cliente and tabla_actual.localidad_cliente.strip():
            exactos = base_q.filter(
                TablaKM.localidad_cliente.ilike(tabla_actual.localidad_cliente.strip())
            ).all()

        corredor = []
        if tabla_actual.spst_id:
            exact_ids = {i.id for i, _ in exactos}
            km = tabla_actual.kms_recorrido
            corridor_rows = base_q.filter(
                TablaKM.spst_id == tabla_actual.spst_id,
                TablaKM.kms_recorrido.between(km - UMBRAL_CORREDOR_KM, km + UMBRAL_CORREDOR_KM),
            ).all()
            corredor = [(i, t) for i, t in corridor_rows if i.id not in exact_ids]

        return exactos, corredor

    def _alertas_exactos(self, incidente, cobrado, exactos, localidad):
        incidentes = [i for i, _ in exactos]

        if cobrado > 0:
            duplicados = [i for i in incidentes if (i.cant_km_cobrado or 0) > 0]
            if duplicados:
                refs = [f"#{i.numero_incidente} ({i.cant_km_cobrado} km)" for i in duplicados]
                return [self._alerta(
                    f"Ruta compartida con KMs cobrados duplicados: se cobraron {cobrado} km "
                    f"en este incidente y también en: {', '.join(refs)} en la misma fecha y localidad.",
                    contexto={
                        "tipo": "duplicado",
                        "cobrado_este": cobrado,
                        "otros_incidentes": [i.numero_incidente for i in duplicados],
                        "localidad": localidad,
                    },
                )]

        elif cobrado == 0:
            con_km = next((i for i in incidentes if (i.cant_km_cobrado or 0) > 0), None)
            if con_km:
                return [self._alerta(
                    f"Ruta compartida detectada correctamente: agrupado con incidente "
                    f"#{con_km.numero_incidente} ({con_km.cant_km_cobrado} km) "
                    f"en la misma localidad el mismo día.",
                    contexto={
                        "tipo": "agrupado_ok",
                        "incidente_principal": con_km.numero_incidente,
                        "kms_principal": con_km.cant_km_cobrado,
                        "localidad": localidad,
                    },
                )]

        return []

    def _alertas_corredor(self, cobrado, corredor, tabla_actual):
        km_actual = tabla_actual.kms_recorrido
        localidad_actual = tabla_actual.localidad_cliente or "sucursal"

        if cobrado > 0:
            duplicados = [(i, t) for i, t in corredor if (i.cant_km_cobrado or 0) > 0]
            if duplicados:
                refs = [
                    f"#{i.numero_incidente} ({i.cant_km_cobrado} km, {t.localidad_cliente})"
                    for i, t in duplicados
                ]
                return [self._alerta(
                    f"Corredor de ruta compartido: se cobraron {cobrado} km en este incidente "
                    f"y también km en: {', '.join(refs)} el mismo día "
                    f"(mismo SPST, diferencia ≤ {UMBRAL_CORREDOR_KM} km).",
                    contexto={
                        "tipo": "corredor_duplicado",
                        "cobrado_este": cobrado,
                        "km_actual": km_actual,
                        "otros_incidentes": [i.numero_incidente for i, _ in duplicados],
                        "spst_id": tabla_actual.spst_id,
                    },
                )]

            sin_km = [(i, t) for i, t in corredor if (i.cant_km_cobrado or 0) == 0]
            if sin_km:
                refs = [
                    f"#{i.numero_incidente} ({t.localidad_cliente}, {t.kms_recorrido} km esperados)"
                    for i, t in sin_km
                ]
                return [self._alerta(
                    f"Este incidente cobró {cobrado} km incluyendo el tramo compartido con: "
                    f"{', '.join(refs)} del mismo corredor. "
                    f"Verificar si es un único viaje o viajes separados.",
                    contexto={
                        "tipo": "corredor_contenido",
                        "cobrado_este": cobrado,
                        "km_actual": km_actual,
                        "otros_incidentes": [i.numero_incidente for i, _ in sin_km],
                        "spst_id": tabla_actual.spst_id,
                    },
                )]

        elif cobrado == 0:
            con_km = next(((i, t) for i, t in corredor if (i.cant_km_cobrado or 0) > 0), None)
            if con_km:
                i_principal, t_principal = con_km
                return [self._alerta(
                    f"Corredor de ruta compartido correctamente agrupado: este incidente "
                    f"({localidad_actual}, {km_actual} km) no cobró viáticos, "
                    f"agrupado con #{i_principal.numero_incidente} "
                    f"({t_principal.localidad_cliente}, {i_principal.cant_km_cobrado} km cobrados) "
                    f"el mismo día.",
                    contexto={
                        "tipo": "corredor_agrupado_ok",
                        "incidente_principal": i_principal.numero_incidente,
                        "kms_principal": i_principal.cant_km_cobrado,
                        "km_este": km_actual,
                        "spst_id": tabla_actual.spst_id,
                    },
                )]

        return []
