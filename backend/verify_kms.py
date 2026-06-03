import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.tabla_km import TablaKM
from app.models.spst import SPST

db = SessionLocal()
try:
    res = db.query(TablaKM).filter(TablaKM.prestador_id == 3).all()
    bases = set()
    for r in res:
        spst = db.query(SPST).filter(SPST.id == r.spst_id).first()
        bases.add((r.empresa_nombre, r.sucursal_nombre, spst.nombre if spst else 'None', spst.zona if spst else 'None'))
        
    print(f"Total TablaKM entries for INFOMAC: {len(res)}")
    print("Unique destinations:")
    for b in list(bases)[:30]:
        print(b)
finally:
    db.close()
