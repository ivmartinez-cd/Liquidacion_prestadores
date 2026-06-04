import pandas as pd
import re
from io import BytesIO
from datetime import datetime, date
from typing import List, Dict, Any, Optional


def _parse_monto(valor: Any) -> float:
    """Convierte formato argentino '$58.042,00' o '58042.00' a float."""
    if valor is None:
        return 0.0
    s = str(valor).strip().replace("$", "").replace(" ", "")
    if s in ("", "-", "nan", "None"):
        return 0.0
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_fecha(valor: Any) -> Optional[date]:
    if valor is None:
        return None
    s = str(valor).strip()
    if s in ("", "nan", "None"):
        return None
    for fmt in ("%Y%m%d", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _normalizar_tipo(raw: str) -> str:
    raw = raw.lower().strip()
    if "instalacion" in raw or "instalación" in raw or "desinstal" in raw:
        return "instalacion_desinstalacion"
    if "pre-correctivo" in raw or "pre correctivo" in raw or "preco" in raw:
        return "pre_correctivo"
    if "preventivo" in raw:
        return "preventivo"
    if "correctivo" in raw:
        return "correctivo"
    if "guardia" in raw:
        return "guardia"
    if "sistema" in raw:
        return "sistemas"
    return raw or "correctivo"


def _map_columns(cols: List) -> Dict:
    patrones = {
        "numero_incidente": ["incidente", "nro incidente", "número incidente"],
        "rubro": ["rubro"],
        "tipo": ["tipo"],
        "empresa": ["empresa", "cliente"],
        "sucursal": ["sucursal"],
        "nro_serie": ["nro. serie", "nro serie", "serie", "número de serie"],
        "fecha_cierre": ["fecha cierre", "fecha de cierre", "cierre"],
        "costo_serv": ["costo serv", "costo servicio", "precio serv"],
        "cant_km": ["cant. km", "cant km", "cantidad km"],
        "costo_km": ["costo km", "precio km"],
        "total_viaje": ["total viaje", "viaje"],
        "costo_total": ["costo total", "total"],
        "pasa_it": ["p.it", "p. it", "pasa it", "pit"],
    }
    mapping = {}
    for col in cols:
        col_lower = str(col).lower().strip()
        for target, pats in patrones.items():
            if any(p in col_lower for p in pats):
                mapping[col] = target
                break
    return mapping


def _extract_numero_liquidacion(nombre: str) -> str:
    m = re.search(r"liquidacion[_-](\d+[-_]\d+)", nombre, re.IGNORECASE)
    return m.group(1).replace("_", "-") if m else ""


def _extract_tipo_liquidacion(nombre: str) -> str:
    n = nombre.lower()
    if "_preco" in n:
        return "preco"
    if "_cc" in n or "centro_civico" in n or "centro civico" in n:
        return "cc"
    if "deposito" in n or "bodega" in n:
        return "deposito"
    return "regular"


def _extract_periodo(nombre: str, incidentes: List[Dict]) -> str:
    # 1. Intentar obtener el período más frecuente a partir de las fechas de cierre de los incidentes (es lo más preciso)
    periodos = []
    for inc in incidentes:
        f = inc.get("fecha_cierre")
        if f:
            periodos.append(f"{f.year}-{f.month:02d}")
    
    if periodos:
        # Retornar el período más frecuente
        return max(set(periodos), key=periodos.count)
        
    # 2. Si no hay incidentes con fecha de cierre, intentar extraerlo del nombre del archivo
    m = re.search(r"_(\d{4})(\d{2})\d{2}", nombre)
    if m:
        try:
            anio = int(m.group(1))
            mes = int(m.group(2))
            # Fallback: asumir que el archivo se exportó el mes siguiente al período liquidado
            if mes == 1:
                mes = 12
                anio -= 1
            else:
                mes -= 1
            return f"{anio}-{mes:02d}"
        except ValueError:
            pass
    return ""


def parse_liquidacion(contenido: bytes, nombre_archivo: str) -> Dict[str, Any]:
    """
    Parsea el archivo HTML/XLS exportado desde la aplicación web.
    Soporta el formato real observado: tabla HTML con extensión .xls
    """
    try:
        tables = pd.read_html(BytesIO(contenido), header=0, flavor="lxml")
    except Exception:
        try:
            tables = pd.read_html(BytesIO(contenido), header=0)
        except Exception as e:
            raise ValueError(f"No se pudo leer el archivo como tabla HTML: {e}")

    if not tables:
        raise ValueError("No se encontraron tablas en el archivo")

    # Buscar la tabla que tenga columna de incidentes
    df = None
    for t in tables:
        cols = [str(c).lower() for c in t.columns]
        if any("incidente" in c for c in cols):
            df = t
            break

    if df is None:
        df = max(tables, key=lambda t: len(t))

    col_map = _map_columns(df.columns.tolist())
    df = df.rename(columns=col_map)

    incidentes = []
    for _, row in df.iterrows():
        num_raw = str(row.get("numero_incidente", "")).strip()
        if not num_raw or num_raw in ("nan", "Incidente", ""):
            continue

        # Extraer número del posible texto de link HTML
        m = re.search(r"\d{5,7}[-–]\d+", num_raw)
        numero = m.group() if m else num_raw

        tipo_raw = str(row.get("tipo", "correctivo")).strip()

        incidente = {
            "numero_incidente": numero,
            "rubro": str(row.get("rubro", "")).strip() or "Impresoras",
            "tipo": _normalizar_tipo(tipo_raw),
            "empresa_nombre": str(row.get("empresa", "")).strip(),
            "sucursal_nombre": str(row.get("sucursal", "")).strip(),
            "nro_serie": str(row.get("nro_serie", "")).strip(),
            "fecha_cierre": _parse_fecha(row.get("fecha_cierre")),
            "costo_servicio_cobrado": _parse_monto(row.get("costo_serv", 0)),
            "cant_km_cobrado": _parse_monto(row.get("cant_km", 0)),
            "costo_km_cobrado": _parse_monto(row.get("costo_km", 0)),
            "total_viaje_cobrado": _parse_monto(row.get("total_viaje", 0)),
            "costo_total_cobrado": _parse_monto(row.get("costo_total", 0)),
            "pasa_it": str(row.get("pasa_it", "SI")).strip().upper() != "NO",
        }
        incidentes.append(incidente)

    return {
        "numero_liquidacion": _extract_numero_liquidacion(nombre_archivo),
        "periodo": _extract_periodo(nombre_archivo, incidentes),
        "tipo_liquidacion": _extract_tipo_liquidacion(nombre_archivo),
        "incidentes": incidentes,
        "total": len(incidentes),
    }
