from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.regla import ReglaAlerta
from app.schemas.regla import ReglaUpdate, ReglaResponse

router = APIRouter(prefix="/reglas", tags=["reglas"])


@router.get("/", response_model=List[ReglaResponse])
def list_reglas(db: Session = Depends(get_db)):
    return db.query(ReglaAlerta).order_by(ReglaAlerta.codigo).all()


@router.put("/{codigo}", response_model=ReglaResponse)
def update_regla(codigo: str, data: ReglaUpdate, db: Session = Depends(get_db)):
    r = db.query(ReglaAlerta).filter(ReglaAlerta.codigo == codigo).first()
    if not r:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r
