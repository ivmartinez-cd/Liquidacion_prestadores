from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.liquidacion import Liquidacion
from app.models.alerta import Alerta
from app.models.prestador import Prestador

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_liq = db.query(func.count(Liquidacion.id)).scalar() or 0
    liq_pendientes = db.query(func.count(Liquidacion.id)).filter(Liquidacion.estado == "pendiente").scalar() or 0
    alertas_abiertas = db.query(func.count(Alerta.id)).filter(Alerta.estado == "pendiente").scalar() or 0
    alertas_criticas = (
        db.query(func.count(Alerta.id))
        .filter(Alerta.estado == "pendiente", Alerta.riesgo >= 150)
        .scalar() or 0
    )

    alertas_por_tipo = (
        db.query(Alerta.tipo_alerta, func.count(Alerta.id).label("total"))
        .filter(Alerta.estado == "pendiente")
        .group_by(Alerta.tipo_alerta)
        .all()
    )

    recientes = (
        db.query(Liquidacion)
        .order_by(Liquidacion.fecha_importacion.desc())
        .limit(8)
        .all()
    )

    return {
        "total_liquidaciones": total_liq,
        "liquidaciones_pendientes": liq_pendientes,
        "alertas_abiertas": alertas_abiertas,
        "alertas_criticas": alertas_criticas,
        "alertas_por_tipo": [
            {"tipo": row.tipo_alerta, "total": row.total} for row in alertas_por_tipo
        ],
        "recientes": [
            {
                "id": l.id,
                "prestador": l.prestador.nombre_corto if l.prestador else "",
                "periodo": l.periodo,
                "tipo": l.tipo_liquidacion,
                "estado": l.estado,
                "total_incidentes": l.total_incidentes,
                "total_alertas": l.total_alertas,
                "total_importe": l.total_importe,
                "fecha": l.fecha_importacion.isoformat() if l.fecha_importacion else "",
            }
            for l in recientes
        ],
    }
