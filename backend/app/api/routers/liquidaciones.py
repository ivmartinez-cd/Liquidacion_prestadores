from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.liquidacion import Liquidacion
from app.models.incidente import Incidente
from app.models.prestador import Prestador
from app.schemas.liquidacion import LiquidacionListResponse, LiquidacionResponse
from app.importers.csv_parser import parse_liquidacion
from app.core.motor_reglas import ejecutar_motor

router = APIRouter(prefix="/liquidaciones", tags=["liquidaciones"])


@router.get("/", response_model=List[LiquidacionListResponse])
def list_liquidaciones(
    prestador_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Liquidacion)
    if prestador_id:
        q = q.filter(Liquidacion.prestador_id == prestador_id)
    return q.order_by(Liquidacion.fecha_importacion.desc()).all()


@router.post("/importar", status_code=201)
async def importar_liquidacion(
    file: UploadFile = File(...),
    prestador_id: int = Form(...),
    db: Session = Depends(get_db),
):
    if not db.query(Prestador).filter(Prestador.id == prestador_id).first():
        raise HTTPException(status_code=404, detail="Prestador no encontrado")

    contenido = await file.read()

    try:
        datos = parse_liquidacion(contenido, file.filename or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # DEBUG TEMPORAL
    if datos["incidentes"]:
        sample = datos["incidentes"][0]
        print(f"[DEBUG IMPORT] primer incidente: {sample['numero_incidente']} | fecha_cierre={sample['fecha_cierre']!r}")
    # FIN DEBUG

    liq = Liquidacion(
        prestador_id=prestador_id,
        numero_liquidacion=datos["numero_liquidacion"],
        periodo=datos["periodo"],
        tipo_liquidacion=datos["tipo_liquidacion"],
        nombre_archivo=file.filename,
        total_incidentes=datos["total"],
    )
    db.add(liq)
    db.flush()

    for inc_data in datos["incidentes"]:
        db.add(Incidente(liquidacion_id=liq.id, **inc_data))

    db.commit()
    db.refresh(liq)

    liq.total_importe = sum(i.costo_total_cobrado or 0 for i in liq.incidentes)
    db.commit()

    resultado = ejecutar_motor(liq.id, db)

    return {
        "liquidacion_id": liq.id,
        "total_incidentes": datos["total"],
        "total_alertas": resultado.get("total_alertas", 0),
        "mensaje": (
            f"Importación exitosa. {datos['total']} incidentes procesados, "
            f"{resultado.get('total_alertas', 0)} alertas generadas."
        ),
    }


@router.get("/{id}", response_model=LiquidacionResponse)
def get_liquidacion(id: int, db: Session = Depends(get_db)):
    liq = db.query(Liquidacion).filter(Liquidacion.id == id).first()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return liq


@router.post("/{id}/reanalize")
def reanalize(id: int, db: Session = Depends(get_db)):
    if not db.query(Liquidacion).filter(Liquidacion.id == id).first():
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return ejecutar_motor(id, db)


@router.put("/{id}/estado")
def cambiar_estado(id: int, estado: str, db: Session = Depends(get_db)):
    estados_validos = {"pendiente", "en_revision", "aprobada", "rechazada"}
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {estados_validos}")
    liq = db.query(Liquidacion).filter(Liquidacion.id == id).first()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    liq.estado = estado
    db.commit()
    return {"estado": estado}


@router.delete("/{id}", status_code=204)
def delete_liquidacion(id: int, db: Session = Depends(get_db)):
    liq = db.query(Liquidacion).filter(Liquidacion.id == id).first()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    db.delete(liq)
    db.commit()
