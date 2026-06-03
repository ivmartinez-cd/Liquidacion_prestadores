from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.spst import SPST
from app.schemas.spst import SPSTCreate, SPSTUpdate, SPSTResponse

router = APIRouter(prefix="/spsts", tags=["spsts"])


@router.get("/", response_model=List[SPSTResponse])
def list_spsts(prestador_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(SPST)
    if prestador_id:
        q = q.filter(SPST.prestador_id == prestador_id)
    return q.order_by(SPST.nombre).all()


@router.post("/", response_model=SPSTResponse, status_code=201)
def create_spst(data: SPSTCreate, db: Session = Depends(get_db)):
    s = SPST(**data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/{id}", response_model=SPSTResponse)
def get_spst(id: int, db: Session = Depends(get_db)):
    s = db.query(SPST).filter(SPST.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="SPST no encontrado")
    return s


@router.put("/{id}", response_model=SPSTResponse)
def update_spst(id: int, data: SPSTUpdate, db: Session = Depends(get_db)):
    s = db.query(SPST).filter(SPST.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="SPST no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{id}", status_code=204)
def delete_spst(id: int, db: Session = Depends(get_db)):
    s = db.query(SPST).filter(SPST.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="SPST no encontrado")
    db.delete(s)
    db.commit()
