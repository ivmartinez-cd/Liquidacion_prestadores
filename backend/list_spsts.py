import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.spst import SPST
from app.models.prestador import Prestador

db = SessionLocal()
try:
    res = db.query(SPST).all()
    for r in res:
        p = db.query(Prestador).filter(Prestador.id == r.prestador_id).first()
        print(f"ID: {r.id} | Prestador: {p.nombre_corto if p else 'N/A'} | Nombre: {r.nombre} | Zona: {r.zona} | Localidad: {r.localidad}")
finally:
    db.close()
