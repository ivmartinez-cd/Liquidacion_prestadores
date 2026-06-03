from sqlalchemy.orm import Session
from app.models.liquidacion import Liquidacion
from app.models.alerta import Alerta
from app.models.resolucion import Resolucion
from app.models.regla import ReglaAlerta
from app.models.observacion import Observacion, ObservacionIncidente
from app.core.evaluadores.alt001_precio import EvaluadorALT001
from app.core.evaluadores.alt002_km import EvaluadorALT002
from app.core.evaluadores.alt003_viatico import EvaluadorALT003
from app.core.evaluadores.alt004_duplicado import EvaluadorALT004
from app.core.evaluadores.alt005_ruta import EvaluadorALT005
from app.core.evaluadores.alt008_tarifario import EvaluadorALT008
from app.core.evaluadores.alt009_spst import EvaluadorALT009

EVALUADORES = {
    "ALT001": EvaluadorALT001,
    "ALT002": EvaluadorALT002,
    "ALT003": EvaluadorALT003,
    "ALT004": EvaluadorALT004,
    "ALT005": EvaluadorALT005,
    "ALT008": EvaluadorALT008,
    "ALT009": EvaluadorALT009,
}

# Evaluadores que implementan evaluar_grupo() para generar observaciones agrupadas
EVALUADORES_GRUPO = ["ALT005"]


def ejecutar_motor(liquidacion_id: int, db: Session) -> dict:
    liquidacion = db.query(Liquidacion).filter(Liquidacion.id == liquidacion_id).first()
    if not liquidacion:
        return {"error": "Liquidación no encontrada"}

    # Limpiar alertas anteriores (y sus resoluciones)
    alerta_ids = [a.id for a in db.query(Alerta.id).filter(Alerta.liquidacion_id == liquidacion_id).all()]
    if alerta_ids:
        db.query(Resolucion).filter(Resolucion.alerta_id.in_(alerta_ids)).delete(synchronize_session=False)
    db.query(Alerta).filter(Alerta.liquidacion_id == liquidacion_id).delete(synchronize_session=False)

    # Limpiar observaciones anteriores
    obs_ids = [o.id for o in db.query(Observacion.id).filter(Observacion.liquidacion_id == liquidacion_id).all()]
    if obs_ids:
        db.query(ObservacionIncidente).filter(
            ObservacionIncidente.observacion_id.in_(obs_ids)
        ).delete(synchronize_session=False)
    db.query(Observacion).filter(Observacion.liquidacion_id == liquidacion_id).delete(synchronize_session=False)

    db.commit()

    reglas = {r.codigo: r for r in db.query(ReglaAlerta).filter(ReglaAlerta.activa == True).all()}

    alertas_generadas = []

    # --- Fase 1: evaluar por incidente (lógica existente) ---
    for incidente in liquidacion.incidentes:
        incidente_con_alertas = False

        for codigo, ClaseEvaluador in EVALUADORES.items():
            regla = reglas.get(codigo)
            if not regla:
                continue

            evaluador = ClaseEvaluador(db, liquidacion, regla)
            try:
                resultados = evaluador.evaluar(incidente)
            except Exception:
                continue

            for r in resultados:
                alerta = Alerta(
                    incidente_id=incidente.id,
                    liquidacion_id=liquidacion_id,
                    tipo_alerta=codigo,
                    descripcion=r["descripcion"],
                    datos_contexto=r.get("contexto", {}),
                    riesgo=r["riesgo"],
                )
                db.add(alerta)
                alertas_generadas.append(alerta)
                incidente_con_alertas = True

        incidente.estado_validacion = "con_alertas" if incidente_con_alertas else "ok"

    db.commit()

    # --- Fase 2: evaluar a nivel de grupo (genera observaciones) ---
    observaciones_generadas = []

    for codigo in EVALUADORES_GRUPO:
        regla = reglas.get(codigo)
        if not regla:
            continue

        ClaseEvaluador = EVALUADORES[codigo]
        evaluador = ClaseEvaluador(db, liquidacion, regla)
        try:
            resultados_grupo = evaluador.evaluar_grupo(liquidacion)
        except Exception:
            continue

        for obs_result in resultados_grupo:
            obs = Observacion(
                liquidacion_id=liquidacion_id,
                tipo_observacion=obs_result.tipo,
                severidad=obs_result.severidad,
                titulo=obs_result.titulo,
                descripcion=obs_result.descripcion,
                datos_contexto=obs_result.contexto,
                monto_cobrado=obs_result.monto_cobrado,
                monto_esperado=obs_result.monto_esperado,
                diferencia=round(obs_result.monto_cobrado - obs_result.monto_esperado, 2),
                regla_codigo=obs_result.regla_codigo,
            )
            db.add(obs)
            db.flush()  # obtener obs.id

            for inc_id in obs_result.incidentes_relacionados:
                rol = "principal" if inc_id == obs_result.incidente_principal_id else "referencia"
                db.add(ObservacionIncidente(
                    observacion_id=obs.id,
                    incidente_id=inc_id,
                    rol=rol,
                ))

            observaciones_generadas.append(obs)

    db.commit()

    liquidacion.total_alertas = len(alertas_generadas)
    db.commit()

    return {
        "total_incidentes": len(liquidacion.incidentes),
        "total_alertas": len(alertas_generadas),
        "total_observaciones": len(observaciones_generadas),
    }
