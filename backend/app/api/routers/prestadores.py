from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import math
import re
import io
from datetime import date

from app.database import get_db
from app.models.prestador import Prestador
from app.models.spst import SPST
from app.models.tarifario import Tarifario
from app.models.tabla_km import TablaKM
from app.schemas.prestador import PrestadorCreate, PrestadorUpdate, PrestadorResponse

router = APIRouter(prefix="/prestadores", tags=["prestadores"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _nan(v) -> bool:
    return v is None or (isinstance(v, float) and math.isnan(v))


def _col(df, *names):
    lower = {c.lower(): c for c in df.columns}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


_TIPO_MAP = {
    "correctivo": "correctivo",
    "pre-correctivo": "pre_correctivo",
    "pre correctivo": "pre_correctivo",
    "instalación-desinstalación": "instalacion_desinstalacion",
    "instalacion-desinstalacion": "instalacion_desinstalacion",
    "instalación desinstalación": "instalacion_desinstalacion",
    "instalacion desinstalacion": "instalacion_desinstalacion",
    "preventivo": "preventivo",
    "guardia": "guardia",
    "sistemas": "sistemas",
}


def _normalize_tipo(raw: str) -> Optional[str]:
    t = raw.lower().strip()
    # Try exact match first
    for k, v in _TIPO_MAP.items():
        if t == k:
            return v
    # Substring matches
    if "pre" in t and "correctiv" in t:
        return "pre_correctivo"
    if "correctiv" in t:
        return "correctivo"
    if "instal" in t or "desinstal" in t:
        return "instalacion_desinstalacion"
    if "prevent" in t:
        return "preventivo"
    if "guardia" in t:
        return "guardia"
    if "sistema" in t:
        return "sistemas"
    return None


def _parse_vigencia(filename: str) -> Optional[date]:
    m = re.search(r"(\d{6})\.\w+$", filename, re.IGNORECASE)
    if m:
        yyyymm = m.group(1)
        try:
            return date(int(yyyymm[:4]), int(yyyymm[4:]), 1)
        except ValueError:
            pass
    return None


def _read_enero(data: bytes):
    import pandas as pd
    xl = pd.ExcelFile(io.BytesIO(data))
    sheet = next((s for s in xl.sheet_names if s.strip().upper() == "ENERO"), None)
    if sheet is None:
        raise ValueError(f"No se encontró hoja ENERO. Hojas: {xl.sheet_names}")
    raw = xl.parse(sheet, header=None)
    # Extract nombre_corto from AGENTE: row
    nombre_corto = None
    header_row_idx = None
    for i, row in raw.iterrows():
        vals = [str(v).strip() for v in row.values if not _nan(v) and str(v).strip()]
        if not vals:
            continue
        if "AGENTE:" in vals:
            idx = list(row.values).index("AGENTE:") if "AGENTE:" in list(row.values) else None
            if idx is not None and idx + 1 < len(row.values):
                nombre_corto = str(row.values[idx + 1]).strip()
        if "Incidente" in vals:
            header_row_idx = i
            break
    df = xl.parse(sheet, header=header_row_idx) if header_row_idx is not None else None
    return nombre_corto, df


def _extract_tarifarios(df, prestador_id: int, vigencia: date) -> list:
    if df is None:
        return []
    col_tipo = _col(df, "Tipo")
    col_costo_serv = _col(df, "Costo Serv")
    col_costo_km = _col(df, "Costo Km")
    if not col_tipo or not col_costo_serv:
        return []
    seen = set()
    tarifarios = []
    for _, row in df.iterrows():
        tipo_raw = str(row[col_tipo]).strip() if not _nan(row[col_tipo]) else None
        if not tipo_raw:
            continue
        tipo = _normalize_tipo(tipo_raw)
        if not tipo:
            continue
        try:
            costo_serv = float(row[col_costo_serv])
            if _nan(costo_serv) or costo_serv <= 0:
                continue
        except (TypeError, ValueError):
            continue
        costo_km = 0.0
        if col_costo_km and not _nan(row[col_costo_km]):
            try:
                costo_km = float(row[col_costo_km])
                if _nan(costo_km):
                    costo_km = 0.0
            except (TypeError, ValueError):
                costo_km = 0.0
        key = (tipo, round(costo_serv, 2))
        if key in seen:
            continue
        seen.add(key)
        tarifarios.append(Tarifario(
            prestador_id=prestador_id,
            tipo_servicio=tipo,
            costo_servicio=costo_serv,
            costo_km=costo_km,
            vigencia_desde=vigencia,
        ))
    return tarifarios


def _read_tabla_kms(data: bytes):
    import pandas as pd
    xl = pd.ExcelFile(io.BytesIO(data))
    candidates = ["TABLA KMS", "TABLA DE KMS", "TABLA KMS 2023"]
    sheet = next(
        (s for s in xl.sheet_names if s.strip().upper() in [c.upper() for c in candidates]),
        None
    )
    if sheet is None:
        return None, None, None
    raw = xl.parse(sheet, header=None)
    # Find header row
    header_row_idx = None
    for i, row in raw.iterrows():
        vals = [str(v).lower() for v in row.values if not _nan(v)]
        if any("sucursal" in v for v in vals):
            header_row_idx = i
            break
    df = raw if header_row_idx is None else xl.parse(sheet, header=header_row_idx)
    return df, sheet, xl


def _extract_spst_names(df) -> list:
    if df is None:
        return []
    col_spst = _col(df, "Prestador", "Base")
    if not col_spst:
        return []
    names = set()
    for v in df[col_spst].dropna():
        s = str(v).strip()
        if s and s.lower() not in ("prestador", "base", "nan"):
            names.add(s)
    return sorted(names)


# ─── Rutas ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[PrestadorResponse])
def list_prestadores(db: Session = Depends(get_db)):
    return db.query(Prestador).order_by(Prestador.nombre_corto).all()


# IMPORTANT: /importar-excel must be registered BEFORE /{id} routes.
@router.post("/importar-excel")
async def importar_excel_prestador(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx o .xls")

    data = await file.read()
    filename = file.filename

    # 1. Read ENERO sheet
    try:
        nombre_corto, enero_df = _read_enero(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not nombre_corto:
        raise HTTPException(status_code=422, detail="No se encontró el campo AGENTE: en la hoja ENERO")

    # 2. Infer vigencia from filename
    vigencia = _parse_vigencia(filename)
    if not vigencia:
        vigencia = date.today().replace(day=1)

    # 3. Find or create Prestador
    prestador = db.query(Prestador).filter(Prestador.nombre_corto == nombre_corto).first()
    prestador_creado = False
    if not prestador:
        prestador = Prestador(
            nombre=nombre_corto,
            nombre_corto=nombre_corto,
        )
        db.add(prestador)
        db.flush()
        prestador_creado = True

    prestador_id = prestador.id

    # 4. Read TABLA KMS sheet for SPSTs + TablaKM
    tabla_df, sheet_name, _ = _read_tabla_kms(data)
    spst_names = _extract_spst_names(tabla_df)

    # 5. Create SPSTs
    existing_spsts = {s.nombre.lower(): s for s in db.query(SPST).filter(SPST.prestador_id == prestador_id).all()}
    spsts_creados = 0
    spst_map = dict(existing_spsts)
    for name in spst_names:
        if name.lower() not in existing_spsts:
            s = SPST(prestador_id=prestador_id, nombre=name)
            db.add(s)
            db.flush()
            spst_map[name.lower()] = s
            spsts_creados += 1

    # 6. Extract and create Tarifarios
    new_tarifarios = _extract_tarifarios(enero_df, prestador_id, vigencia)
    existing_tar = {
        (t.tipo_servicio, round(t.costo_servicio, 2), t.vigencia_desde)
        for t in db.query(Tarifario).filter(Tarifario.prestador_id == prestador_id).all()
    }
    tarifarios_creados = 0
    for t in new_tarifarios:
        key = (t.tipo_servicio, round(t.costo_servicio, 2), t.vigencia_desde)
        if key not in existing_tar:
            db.add(t)
            existing_tar.add(key)
            tarifarios_creados += 1

    # 7. Import TablaKM entries
    tabla_importadas = tabla_omitidas = tabla_errores = 0
    if tabla_df is not None:
        col_sucursal = _col(tabla_df, "Sucursal")
        col_empresa = _col(tabla_df, "Empresa")
        col_kms = _col(tabla_df, "Kms recorrido", "KM", "Kms")
        col_url = _col(tabla_df, "RECORRIDO", "Maps", "URL Maps")
        col_spst = _col(tabla_df, "Prestador", "Base")
        col_domicilio = _col(tabla_df, "Domicilio")
        col_localidad = _col(tabla_df, "Localidad")
        col_provincia = _col(tabla_df, "Provincia")

        if col_sucursal and col_empresa and col_kms:
            existing_km = {
                (e.lower(), s.lower())
                for e, s in db.query(TablaKM.empresa_nombre, TablaKM.sucursal_nombre)
                .filter(TablaKM.prestador_id == prestador_id).all()
            }
            for _, row in tabla_df.iterrows():
                sucursal = str(row[col_sucursal]).strip() if not _nan(row[col_sucursal]) else None
                empresa = str(row[col_empresa]).strip() if not _nan(row[col_empresa]) else None
                if not sucursal or not empresa:
                    continue
                try:
                    kms = float(row[col_kms])
                    if _nan(kms):
                        continue
                except (TypeError, ValueError):
                    continue
                key = (empresa.lower(), sucursal.lower())
                if key in existing_km:
                    tabla_omitidas += 1
                    continue
                spst_val = str(row[col_spst]).strip() if col_spst and not _nan(row[col_spst]) else None
                url = str(row[col_url]).strip() if col_url and not _nan(row[col_url]) else None
                domicilio = str(row[col_domicilio]).strip() if col_domicilio and not _nan(row[col_domicilio]) else None
                localidad = str(row[col_localidad]).strip() if col_localidad and not _nan(row[col_localidad]) else None
                provincia = str(row[col_provincia]).strip() if col_provincia and not _nan(row[col_provincia]) else None
                spst_id = None
                if spst_val:
                    matched = spst_map.get(spst_val.lower())
                    if matched is None:
                        for k, v in spst_map.items():
                            if spst_val.lower() in k or k in spst_val.lower():
                                matched = v
                                break
                    if matched:
                        spst_id = matched.id
                try:
                    t = TablaKM(
                        prestador_id=prestador_id,
                        spst_id=spst_id,
                        empresa_nombre=empresa,
                        sucursal_nombre=sucursal,
                        domicilio_cliente=domicilio,
                        localidad_cliente=localidad,
                        provincia_cliente=provincia,
                        kms_recorrido=kms,
                        umbral_viatico=30.0,
                        url_maps=url if url and url.startswith("http") else None,
                    )
                    t.aplica_viatico = t.kms_recorrido > t.umbral_viatico
                    t.kms_a_facturar = t.kms_recorrido if t.aplica_viatico else 0.0
                    db.add(t)
                    existing_km.add(key)
                    tabla_importadas += 1
                except Exception:
                    tabla_errores += 1

    db.commit()
    return {
        "nombre_corto": nombre_corto,
        "prestador_id": prestador_id,
        "prestador_creado": prestador_creado,
        "vigencia_desde": vigencia.isoformat(),
        "spsts_creados": spsts_creados,
        "tarifarios_creados": tarifarios_creados,
        "tabla_km": {
            "hoja": sheet_name,
            "importadas": tabla_importadas,
            "omitidas": tabla_omitidas,
            "errores": tabla_errores,
        },
    }


@router.post("/", response_model=PrestadorResponse, status_code=201)
def create_prestador(data: PrestadorCreate, db: Session = Depends(get_db)):
    existing = db.query(Prestador).filter(Prestador.nombre_corto == data.nombre_corto).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un prestador con ese nombre corto")
    p = Prestador(**data.model_dump())
    db.add(p)
    db.flush()
    
    # Crear SPST por defecto para evitar doble carga manual
    default_spst = SPST(
        prestador_id=p.id,
        nombre=f"PST {p.nombre}",
        localidad=p.region or "",
        provincia="",
        zona=p.region or "",
        activo=True
    )
    db.add(default_spst)
    
    db.commit()
    db.refresh(p)
    return p


@router.get("/{id}", response_model=PrestadorResponse)
def get_prestador(id: int, db: Session = Depends(get_db)):
    p = db.query(Prestador).filter(Prestador.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prestador no encontrado")
    return p


@router.put("/{id}", response_model=PrestadorResponse)
def update_prestador(id: int, data: PrestadorUpdate, db: Session = Depends(get_db)):
    p = db.query(Prestador).filter(Prestador.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prestador no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{id}", status_code=204)
def delete_prestador(id: int, db: Session = Depends(get_db)):
    p = db.query(Prestador).filter(Prestador.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prestador no encontrado")
    db.delete(p)
    db.commit()
