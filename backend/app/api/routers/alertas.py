from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.alerta import Alerta
from app.models.resolucion import Resolucion
from app.models.liquidacion import Liquidacion
from app.schemas.alerta import AlertaResponse, AlertaDetailResponse, ResolucionCreate

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("/", response_model=List[AlertaResponse])
def list_alertas(
    liquidacion_id: Optional[int] = None,
    prestador_id: Optional[int] = None,
    tipo_alerta: Optional[str] = None,
    estado: Optional[str] = None,
    riesgo_min: Optional[float] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Alerta).join(Liquidacion)
    if liquidacion_id:
        q = q.filter(Alerta.liquidacion_id == liquidacion_id)
    if prestador_id:
        q = q.filter(Liquidacion.prestador_id == prestador_id)
    if tipo_alerta:
        q = q.filter(Alerta.tipo_alerta == tipo_alerta)
    if estado:
        q = q.filter(Alerta.estado == estado)
    if riesgo_min is not None:
        q = q.filter(Alerta.riesgo >= riesgo_min)
    return q.order_by(Alerta.riesgo.desc(), Alerta.fecha_generacion.desc()).all()


@router.get("/{id}", response_model=AlertaDetailResponse)
def get_alerta(id: int, db: Session = Depends(get_db)):
    a = db.query(Alerta).filter(Alerta.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return a


@router.post("/{id}/resolver", status_code=200)
def resolver_alerta(id: int, data: ResolucionCreate, db: Session = Depends(get_db)):
    a = db.query(Alerta).filter(Alerta.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    db.add(Resolucion(alerta_id=id, **data.model_dump()))
    a.estado = "resuelta"
    db.commit()
    return {"mensaje": "Alerta resuelta"}


@router.post("/{id}/descartar", status_code=200)
def descartar_alerta(id: int, db: Session = Depends(get_db)):
    a = db.query(Alerta).filter(Alerta.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    a.estado = "descartada"
    db.commit()
    return {"mensaje": "Alerta descartada"}


@router.post("/{id}/en-revision", status_code=200)
def marcar_en_revision(id: int, db: Session = Depends(get_db)):
    a = db.query(Alerta).filter(Alerta.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    a.estado = "en_revision"
    db.commit()
    return {"mensaje": "Alerta marcada en revisión"}
