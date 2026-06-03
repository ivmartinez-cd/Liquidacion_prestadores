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
    total_incidentes = db.query(func.sum(Liquidacion.total_incidentes)).scalar() or 0
    total_importe = db.query(func.sum(Liquidacion.total_importe)).scalar() or 0

    recientes = (
        db.query(Liquidacion)
        .order_by(Liquidacion.fecha_importacion.desc())
        .limit(8)
        .all()
    )

    return {
        "total_liquidaciones": total_liq,
        "liquidaciones_pendientes": liq_pendientes,
        "total_incidentes": total_incidentes,
        "total_importe": total_importe,
        "recientes": [
            {
                "id": l.id,
                "prestador": l.prestador.nombre if l.prestador else "",
                "periodo": l.periodo,
                "tipo": l.tipo_liquidacion,
                "estado": l.estado,
                "total_incidentes": l.total_incidentes,
                "total_importe": l.total_importe,
                "fecha": l.fecha_importacion.isoformat() if l.fecha_importacion else "",
            }
            for l in recientes
        ],
    }
