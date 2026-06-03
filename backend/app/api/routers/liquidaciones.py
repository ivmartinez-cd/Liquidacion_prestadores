from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.liquidacion import Liquidacion
from app.models.incidente import Incidente
from app.models.prestador import Prestador
from app.models.tabla_km import TablaKM
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

    # Build a sucursal -> (localidad, spst_id) map from TablaKM to enrich incidents
    km_rows = db.query(TablaKM.sucursal_nombre, TablaKM.localidad_cliente, TablaKM.spst_id).filter(
        TablaKM.sucursal_nombre.isnot(None),
    ).distinct().all()
    sucursal_to_info = {}
    for row in km_rows:
        if row.sucursal_nombre:
            sucursal_to_info[row.sucursal_nombre.strip().lower()] = {
                "localidad": row.localidad_cliente,
                "spst_id": row.spst_id,
            }

    # Build enriched response manually
    response_data = LiquidacionResponse.model_validate(liq)
    for inc_schema in response_data.incidentes:
        if inc_schema.sucursal_nombre:
            key = inc_schema.sucursal_nombre.strip().lower()
            info = sucursal_to_info.get(key)
            if info:
                inc_schema.localidad_cliente = info["localidad"]
                inc_schema.spst_id = info["spst_id"]

    return response_data


@router.put("/{id}/observaciones/{obs_id}/estado")
def cambiar_estado_observacion(
    id: int,
    obs_id: int,
    estado: str,
    db: Session = Depends(get_db),
):
    from app.models.observacion import Observacion
    estados_validos = {"pendiente", "en_revision", "resuelta", "rechazada", "excepcion_aprobada"}
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {estados_validos}")
    obs = db.query(Observacion).filter(
        Observacion.id == obs_id,
        Observacion.liquidacion_id == id,
    ).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    obs.estado = estado
    db.commit()
    return {"estado": estado}


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
