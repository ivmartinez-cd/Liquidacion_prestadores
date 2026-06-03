from sqlalchemy.orm import Session
from app.models.liquidacion import Liquidacion
from app.models.alerta import Alerta
from app.models.resolucion import Resolucion
from app.models.regla import ReglaAlerta
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


def ejecutar_motor(liquidacion_id: int, db: Session) -> dict:
    liquidacion = db.query(Liquidacion).filter(Liquidacion.id == liquidacion_id).first()
    if not liquidacion:
        return {"error": "Liquidación no encontrada"}

    # Limpiar alertas anteriores (y sus resoluciones) de esta liquidación
    alerta_ids = [a.id for a in db.query(Alerta.id).filter(Alerta.liquidacion_id == liquidacion_id).all()]
    if alerta_ids:
        db.query(Resolucion).filter(Resolucion.alerta_id.in_(alerta_ids)).delete(synchronize_session=False)
    db.query(Alerta).filter(Alerta.liquidacion_id == liquidacion_id).delete(synchronize_session=False)
    db.commit()

    reglas = {r.codigo: r for r in db.query(ReglaAlerta).filter(ReglaAlerta.activa == True).all()}

    alertas_generadas = []

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

    liquidacion.total_alertas = len(alertas_generadas)
    db.commit()

    return {
        "total_incidentes": len(liquidacion.incidentes),
        "total_alertas": len(alertas_generadas),
    }
