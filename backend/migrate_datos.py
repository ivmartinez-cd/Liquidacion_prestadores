"""
Migra tarifarios y tabla KM de los 4 PSTs desde los archivos Excel.
Ejecutar con: python migrate_datos.py
El backend debe estar corriendo en http://localhost:8001
"""
import sys
import requests
import pandas as pd
import math

API = "http://localhost:8001"


def get(path):
    r = requests.get(f"{API}{path}")
    r.raise_for_status()
    return r.json()


def post(path, data):
    r = requests.post(f"{API}{path}", json=data)
    if not r.ok:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return None
    return r.json()


def clean(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    if isinstance(val, str):
        val = val.strip()
        return val if val else None
    return val


def clean_float(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


# ─── STEP 1: fetch existing data ─────────────────────────────────────────────

print("Obteniendo datos actuales...")
prestadores = {p["nombre_corto"]: p for p in get("/prestadores/")}
spsts_raw = get("/spsts/")
spsts_by_nombre = {s["nombre"]: s for s in spsts_raw}
spsts_by_prestador = {}
for s in spsts_raw:
    spsts_by_prestador.setdefault(s["prestador_id"], []).append(s)

p_pentacom = prestadores["PENTACOM"]
p_pertex = prestadores["PERTEX"]
p_infomac = prestadores["INFOMAC"]
p_sanjuan = prestadores["SAN JUAN"]

print(f"  Prestadores: {list(prestadores.keys())}")
print(f"  SPSTs cargados: {len(spsts_raw)}")


# ─── STEP 2: create missing PENTACOM SPSTs ────────────────────────────────────

PENTACOM_SPST_MAP = {
    "PST Cordoba - Pentacom S.A.":    "PST Córdoba - Pentacom S.A.",
    "SPST Pentacom - Rio IV":         "SPST Pentacom - Río IV",
    "Laboulaye - Roberto Gil":        "SPST Pentacom - Laboulaye",
    "SPST Pentacom - Marcos Juarez":  "SPST Pentacom - Marcos Juárez",
    "SPST Villa María":               "SPST Pentacom - Villa María",
    "Pentacom - Arroyito":            "SPST Pentacom - Arroyito",
    "SPST Pentacom - Morrison ":      "SPST Pentacom - Morrison",
    "SPST Pentacom - Bell Ville":     "SPST Pentacom - Bell Ville",
    "SPST Pentacom - Villa Dolores":  "SPST Pentacom - Villa Dolores",
}

NUEVOS_SPST_PENTACOM = {
    "SPST Pentacom - Morrison":      {"localidad": "Morrison",     "provincia": "Córdoba", "zona": "Morrison"},
    "SPST Pentacom - Bell Ville":    {"localidad": "Bell Ville",   "provincia": "Córdoba", "zona": "Bell Ville"},
    "SPST Pentacom - Villa Dolores": {"localidad": "Villa Dolores","provincia": "Córdoba", "zona": "Villa Dolores"},
}

print("\nCreando SPSTs faltantes de PENTACOM...")
for nombre, extras in NUEVOS_SPST_PENTACOM.items():
    if nombre not in spsts_by_nombre:
        payload = {
            "prestador_id": p_pentacom["id"],
            "nombre": nombre,
            **extras,
        }
        result = post("/spsts/", payload)
        if result:
            spsts_by_nombre[nombre] = result
            print(f"  Creado: {nombre}")
        else:
            print(f"  FALLO: {nombre}")
    else:
        print(f"  Ya existe: {nombre}")

# refresh SPST lookup
spsts_raw = get("/spsts/")
spsts_by_nombre = {s["nombre"]: s for s in spsts_raw}


def resolve_pentacom_spst(raw_name):
    canonical = PENTACOM_SPST_MAP.get(str(raw_name).strip())
    if canonical and canonical in spsts_by_nombre:
        return spsts_by_nombre[canonical]["id"]
    return None


# ─── STEP 3: tarifarios ───────────────────────────────────────────────────────

print("\nCargando tarifarios...")

TARIFARIOS = [
    # PENTACOM
    {"prestador_id": p_pentacom["id"], "tipo_servicio": "correctivo",  "zona": None, "costo_servicio": 58042.0, "costo_km": 649.53, "vigencia_desde": "2026-01-01"},
    {"prestador_id": p_pentacom["id"], "tipo_servicio": "preventivo",  "zona": None, "costo_servicio": 26832.0, "costo_km": 649.53, "vigencia_desde": "2026-01-01"},
    # PERTEX
    {"prestador_id": p_pertex["id"],   "tipo_servicio": "correctivo",  "zona": None, "costo_servicio": 56596.0, "costo_km": 684.20, "vigencia_desde": "2026-01-01"},
    {"prestador_id": p_pertex["id"],   "tipo_servicio": "preventivo",  "zona": None, "costo_servicio": 28287.0, "costo_km": 684.20, "vigencia_desde": "2026-01-01"},
    # INFOMAC - Villa Mercedes
    {"prestador_id": p_infomac["id"],  "tipo_servicio": "correctivo",  "zona": "Villa Mercedes",      "costo_servicio": 49116.0, "costo_km": 595.60, "vigencia_desde": "2026-01-01"},
    {"prestador_id": p_infomac["id"],  "tipo_servicio": "preventivo",  "zona": "Villa Mercedes",      "costo_servicio": 23073.0, "costo_km": 595.60, "vigencia_desde": "2026-01-01"},
    # INFOMAC - Gral. Roca / Neuquén
    {"prestador_id": p_infomac["id"],  "tipo_servicio": "correctivo",  "zona": "Gral. Roca / Neuquén","costo_servicio": 52534.0, "costo_km": 595.60, "vigencia_desde": "2026-01-01"},
    # SAN JUAN
    {"prestador_id": p_sanjuan["id"],  "tipo_servicio": "correctivo",              "zona": None, "costo_servicio": 46126.0, "costo_km": 633.30, "vigencia_desde": "2026-01-01"},
    {"prestador_id": p_sanjuan["id"],  "tipo_servicio": "instalacion_desinstalacion","zona": None,"costo_servicio": 92252.0, "costo_km": 633.30, "vigencia_desde": "2026-01-01"},
    {"prestador_id": p_sanjuan["id"],  "tipo_servicio": "preventivo",              "zona": None, "costo_servicio": 23073.0, "costo_km": 633.30, "vigencia_desde": "2026-01-01"},
]

existing_tarifarios = get("/tarifarios/")
existing_keys = {
    (t["prestador_id"], t["tipo_servicio"], t.get("zona")): t
    for t in existing_tarifarios
}

ok = 0
skip = 0
for t in TARIFARIOS:
    key = (t["prestador_id"], t["tipo_servicio"], t.get("zona"))
    if key in existing_keys:
        skip += 1
        continue
    result = post("/tarifarios/", t)
    if result:
        ok += 1

print(f"  Tarifarios creados: {ok}, ya existían: {skip}")


# ─── STEP 4: tabla KM ─────────────────────────────────────────────────────────

BASE_DIR = "C:/Users/imartinez.CDSA/Desktop/Proyectos/Liquidacion-Prestadores/Docs importantes"

INFOMAC_SPST_BY_BASE = {
    # Gral. Roca / Neuquén zone
    "Bariloche":               "SPST Infomac - Gral. Roca/Neuquén",
    "General Roca":            "SPST Infomac - Gral. Roca/Neuquén",
    "Cutral CO":               "SPST Infomac - Gral. Roca/Neuquén",
    "Rincon de los Sauces":    "SPST Infomac - Gral. Roca/Neuquén",
    "San Martin de los Andes": "SPST Infomac - Gral. Roca/Neuquén",
    "Trelew":                  "SPST Infomac - Gral. Roca/Neuquén",
    "Ushuaia":                 "SPST Infomac - Gral. Roca/Neuquén",
    # Villa Mercedes zone
    "Villa Mercedes":          "SPST Infomac - Villa Mercedes",
    "Pehuajo":                 "SPST Infomac - Villa Mercedes",
    "Trenque Lauquen":         "SPST Infomac - Villa Mercedes",
    "Santa Rosa":              "SPST Infomac - Villa Mercedes",
    "Merlo":                   "SPST Infomac - Villa Mercedes",
    "Goya":                    "SPST Infomac - Villa Mercedes",
    "Tandil":                  "SPST Infomac - Villa Mercedes",
}


def col(df, idx):
    """Access column by index (avoids encoding issues with special chars)."""
    return df.iloc[:, idx]


_existing_km_keys: set | None = None


def _load_existing_km_keys():
    global _existing_km_keys
    if _existing_km_keys is None:
        existing = get("/tabla-km/")
        _existing_km_keys = {
            (r["prestador_id"], r["empresa_nombre"], r["sucursal_nombre"])
            for r in existing
        }
    return _existing_km_keys


def upload_tabla_km(rows):
    keys = _load_existing_km_keys()
    ok = skip = err = 0
    for row in rows:
        key = (row["prestador_id"], row["empresa_nombre"], row["sucursal_nombre"])
        if key in keys:
            skip += 1
            continue
        result = post("/tabla-km/", row)
        if result:
            ok += 1
            keys.add(key)
        else:
            err += 1
    if skip:
        print(f"    ({skip} omitidas por ya existir)")
    return ok, err


# ── 4a. PENTACOM ──────────────────────────────────────────────────────────────
print("\nMigrando TABLA KMS - PENTACOM...")
df_p = pd.ExcelFile(
    f"{BASE_DIR}/PST - Cordoba (Pentacom)/Año 2026/202601/PENTACOM 202601.xlsx"
).parse("TABLA KMS")

rows_pentacom = []
for _, row in df_p.iterrows():
    sucursal = clean(row.get("Sucursal"))
    empresa = clean(row.get("Empresa"))
    if not sucursal or not empresa:
        continue
    kms = clean_float(row.get("Kms recorrido"))
    if kms is None:
        continue
    prestador_raw = clean(row.get("Prestador"))
    spst_id = resolve_pentacom_spst(prestador_raw) if prestador_raw else None

    rows_pentacom.append({
        "prestador_id": p_pentacom["id"],
        "spst_id": spst_id,
        "empresa_nombre": empresa,
        "sucursal_nombre": sucursal,
        "domicilio_cliente": clean(row.get("Domicilio")),
        "localidad_cliente": clean(row.get("Localidad")),
        "provincia_cliente": clean(row.get("Provincia")),
        "kms_recorrido": kms,
        "umbral_viatico": 30.0,
        "url_maps": clean(row.get("RECORRIDO")),
    })

ok, err = upload_tabla_km(rows_pentacom)
print(f"  PENTACOM: {ok} OK, {err} errores (de {len(rows_pentacom)} filas)")


# ── 4b. PERTEX ────────────────────────────────────────────────────────────────
print("\nMigrando TABLA KMS - PERTEX...")
spst_pertex = spsts_by_nombre.get("PST Rosario - Supernova/Pertex")
spst_pertex_id = spst_pertex["id"] if spst_pertex else None

df_pertex = pd.ExcelFile(
    f"{BASE_DIR}/PST - Rosario (SUPERNOVA)/Año 2026/202601/PERTEX 202601.xlsx"
).parse("TABLA KMS")

rows_pertex = []
for _, row in df_pertex.iterrows():
    sucursal = clean(row.get("Sucursal"))
    empresa = clean(row.get("Empresa"))
    if not sucursal or not empresa:
        continue
    kms = clean_float(row.get("Kms recorrido"))
    if kms is None:
        continue
    rows_pertex.append({
        "prestador_id": p_pertex["id"],
        "spst_id": spst_pertex_id,
        "empresa_nombre": empresa,
        "sucursal_nombre": sucursal,
        "domicilio_cliente": clean(row.get("Domicilio")),
        "localidad_cliente": clean(row.get("Localidad")),
        "provincia_cliente": clean(row.get("Provincia")),
        "kms_recorrido": kms,
        "umbral_viatico": 30.0,
        "url_maps": None,
    })

ok, err = upload_tabla_km(rows_pertex)
print(f"  PERTEX: {ok} OK, {err} errores (de {len(rows_pertex)} filas)")


# ── 4c. SAN JUAN ──────────────────────────────────────────────────────────────
print("\nMigrando TABLA KMS - SAN JUAN...")
spst_sj = spsts_by_nombre.get("PST San Juan - Gestión Integral")
spst_sj_id = spst_sj["id"] if spst_sj else None

df_sj = pd.ExcelFile(
    f"{BASE_DIR}/PST - San Juan (Gestion Integral)/Año 2026/202601/SAN JUAN 202601.xlsx"
).parse("TABLA KMS 2023")

rows_sj = []
for _, row in df_sj.iterrows():
    sucursal = clean(row.get("Sucursal"))
    empresa = clean(row.get("Empresa"))
    if not sucursal or not empresa:
        continue
    kms = clean_float(row.get("Kms recorrido"))
    if kms is None:
        continue
    rows_sj.append({
        "prestador_id": p_sanjuan["id"],
        "spst_id": spst_sj_id,
        "empresa_nombre": empresa,
        "sucursal_nombre": sucursal,
        "domicilio_cliente": clean(row.get("Domicilio")),
        "localidad_cliente": clean(row.get("Localidad")),
        "provincia_cliente": clean(row.get("Provincia")),
        "kms_recorrido": kms,
        "umbral_viatico": 30.0,
        "url_maps": clean(row.get("Maps")),
    })

ok, err = upload_tabla_km(rows_sj)
print(f"  SAN JUAN: {ok} OK, {err} errores (de {len(rows_sj)} filas)")


# ── 4d. INFOMAC ───────────────────────────────────────────────────────────────
print("\nMigrando TABLA KMS - INFOMAC...")
df_inf = pd.ExcelFile(
    f"{BASE_DIR}/PST - Villa Mercedes - Nicolas Fernandez/Año 2026/202601/INFOMAC 202601.xlsx"
).parse("TABLA DE KMS")

rows_inf = []
sin_spst = []
for _, row in df_inf.iterrows():
    sucursal = clean(row.get("Sucursal"))
    empresa = clean(row.get("Empresa"))
    if not sucursal or not empresa:
        continue
    kms = clean_float(row.get("Kms recorrido"))
    if kms is None:
        continue
    base_val = clean(row.get("Base"))
    spst_nombre = INFOMAC_SPST_BY_BASE.get(base_val) if base_val else None
    if spst_nombre is None:
        sin_spst.append(base_val)
    spst_obj = spsts_by_nombre.get(spst_nombre) if spst_nombre else None
    spst_id = spst_obj["id"] if spst_obj else None

    rows_inf.append({
        "prestador_id": p_infomac["id"],
        "spst_id": spst_id,
        "empresa_nombre": empresa,
        "sucursal_nombre": sucursal,
        "domicilio_cliente": clean(row.get("Domicilio")),
        "localidad_cliente": clean(row.get("Localidad")),
        "provincia_cliente": clean(row.get("Provincia")),
        "kms_recorrido": kms,
        "umbral_viatico": 30.0,
        "url_maps": clean(row.get("Maps")),
    })

if sin_spst:
    print(f"  INFOMAC bases sin SPST asignado: {set(sin_spst)}")

ok, err = upload_tabla_km(rows_inf)
print(f"  INFOMAC: {ok} OK, {err} errores (de {len(rows_inf)} filas)")


# ─── RESUMEN ──────────────────────────────────────────────────────────────────
print("\n=== MIGRACION COMPLETADA ===")
total = get("/tabla-km/")
print(f"Total filas en Tabla KM: {len(total)}")
tarifarios_final = get("/tarifarios/")
print(f"Total tarifarios: {len(tarifarios_final)}")
spsts_final = get("/spsts/")
print(f"Total SPSTs: {len(spsts_final)}")
