"""
Carga los datos iniciales necesarios para operar:
  - 4 PSTs activos
  - SPSTs de PENTACOM (múltiples zonas)
  - 9 reglas de alerta configuradas
"""
import os
import shutil

# Copiar base de datos existente si estamos en Docker y no existe en el volumen
db_url = os.getenv("DATABASE_URL", "sqlite:///./liquidaciones.db")
if db_url.startswith("sqlite:///"):
    db_path = db_url.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    if not os.path.exists(db_path):
        src_path = "liquidaciones.db"
        if os.path.exists(src_path):
            print(f"Copiando base de datos inicial desde {src_path} a {db_path}...")
            shutil.copy2(src_path, db_path)
            print("Copia completada.")

from app.database import SessionLocal, engine, Base
import app.models  # noqa: F401

Base.metadata.create_all(bind=engine)


def seed_prestadores(db):
    from app.models.prestador import Prestador

    datos = [
        {"nombre": "Pentacom S.A.", "nombre_corto": "PENTACOM", "region": "Córdoba"},
        {"nombre": "Supernova Servicios S.R.L.", "nombre_corto": "PERTEX", "region": "Rosario"},
        {"nombre": "Infomac S.A.S.", "nombre_corto": "INFOMAC", "region": "Villa Mercedes / Gral. Roca / Neuquén"},
        {"nombre": "Gestión Integral S.R.L.", "nombre_corto": "SAN JUAN", "region": "San Juan"},
    ]
    for d in datos:
        if not db.query(Prestador).filter(Prestador.nombre_corto == d["nombre_corto"]).first():
            db.add(Prestador(**d))
    db.commit()
    print("  OK Prestadores")


def seed_spsts(db):
    from app.models.prestador import Prestador
    from app.models.spst import SPST

    pentacom = db.query(Prestador).filter(Prestador.nombre_corto == "PENTACOM").first()
    pertex = db.query(Prestador).filter(Prestador.nombre_corto == "PERTEX").first()
    infomac = db.query(Prestador).filter(Prestador.nombre_corto == "INFOMAC").first()
    sanjuan = db.query(Prestador).filter(Prestador.nombre_corto == "SAN JUAN").first()

    spsts = [
        # PENTACOM — múltiples zonas confirmadas por evidencia
        {"prestador_id": pentacom.id, "nombre": "PST Córdoba - Pentacom S.A.", "localidad": "Córdoba", "provincia": "Córdoba", "zona": "Córdoba Capital"},
        {"prestador_id": pentacom.id, "nombre": "SPST Pentacom - Río IV", "localidad": "Río Cuarto", "provincia": "Córdoba", "zona": "Río Cuarto"},
        {"prestador_id": pentacom.id, "nombre": "SPST Pentacom - Marcos Juárez", "localidad": "Marcos Juárez", "provincia": "Córdoba", "zona": "Marcos Juárez"},
        {"prestador_id": pentacom.id, "nombre": "SPST Pentacom - Villa María", "localidad": "Villa María", "provincia": "Córdoba", "zona": "Villa María"},
        {"prestador_id": pentacom.id, "nombre": "SPST Pentacom - Laboulaye", "localidad": "Laboulaye", "provincia": "Córdoba", "zona": "Laboulaye"},
        {"prestador_id": pentacom.id, "nombre": "SPST Pentacom - Arroyito", "localidad": "Arroyito", "provincia": "Córdoba", "zona": "Arroyito"},
        # PERTEX
        {"prestador_id": pertex.id, "nombre": "PST Rosario - Supernova/Pertex", "localidad": "Rosario", "provincia": "Santa Fe", "zona": "Rosario"},
        # INFOMAC — 2 zonas con tarifas distintas
        {"prestador_id": infomac.id, "nombre": "SPST Infomac - Villa Mercedes", "localidad": "Villa Mercedes", "provincia": "San Luis", "zona": "Villa Mercedes"},
        {"prestador_id": infomac.id, "nombre": "SPST Infomac - Gral. Roca/Neuquén", "localidad": "General Roca", "provincia": "Río Negro", "zona": "Gral. Roca / Neuquén"},
        # SAN JUAN
        {"prestador_id": sanjuan.id, "nombre": "PST San Juan - Gestión Integral", "localidad": "San Juan", "provincia": "San Juan", "zona": "San Juan"},
    ]

    for s in spsts:
        exists = db.query(SPST).filter(
            SPST.prestador_id == s["prestador_id"],
            SPST.nombre == s["nombre"],
        ).first()
        if not exists:
            db.add(SPST(**s))
    db.commit()
    print("  OK SPSTs")


def seed_reglas(db):
    from app.models.regla import ReglaAlerta

    reglas = [
        {
            "codigo": "ALT001",
            "nombre": "Precio Incorrecto",
            "descripcion": "El precio cobrado difiere del tarifario vigente para el período",
            "activa": True,
            "riesgo_base": 100,
            "configuracion": {},
        },
        {
            "codigo": "ALT002",
            "nombre": "KMs Incorrectos",
            "descripcion": "Los kilómetros cobrados difieren de los KMs pactados en la Tabla KM",
            "activa": True,
            "riesgo_base": 100,
            "configuracion": {"tolerancia_km": 0.5},
        },
        {
            "codigo": "ALT003",
            "nombre": "Posible Viático Duplicado",
            "descripcion": "Se detectaron KMs cobrados en la misma sucursal dentro de la ventana de días configurada",
            "activa": True,
            "riesgo_base": 80,
            "configuracion": {"ventana_dias": 30},
        },
        {
            "codigo": "ALT004",
            "nombre": "Servicio Duplicado",
            "descripcion": "El número de incidente ya fue liquidado en una liquidación anterior del mismo PST",
            "activa": True,
            "riesgo_base": 90,
            "configuracion": {},
        },
        {
            "codigo": "ALT005",
            "nombre": "Ruta Compartida",
            "descripcion": "Múltiples incidentes en la misma zona el mismo día podrían compartir recorrido",
            "activa": False,
            "riesgo_base": 40,
            "configuracion": {},
        },
        {
            "codigo": "ALT006",
            "nombre": "Segunda Visita",
            "descripcion": "El equipo recibió un servicio reciente del mismo tipo, posible reincidencia",
            "activa": False,
            "riesgo_base": 30,
            "configuracion": {"ventana_dias": 30},
        },
        {
            "codigo": "ALT007",
            "nombre": "Agrupación de Incidentes",
            "descripcion": "Múltiples incidentes en la misma zona y día podrían agruparse",
            "activa": False,
            "riesgo_base": 40,
            "configuracion": {},
        },
        {
            "codigo": "ALT008",
            "nombre": "Tarifario Inexistente",
            "descripcion": "No existe tarifario para el tipo de servicio en el período de la fecha de cierre",
            "activa": True,
            "riesgo_base": 100,
            "configuracion": {},
        },
        {
            "codigo": "ALT009",
            "nombre": "Par Empresa-Sucursal no encontrado en Tabla KM",
            "descripcion": "No existe entrada en la Tabla KM para esta combinación empresa/sucursal con KMs cobrados",
            "activa": True,
            "riesgo_base": 80,
            "configuracion": {},
        },
    ]

    for r in reglas:
        if not db.query(ReglaAlerta).filter(ReglaAlerta.codigo == r["codigo"]).first():
            db.add(ReglaAlerta(**r))
    db.commit()
    print("  OK Reglas de alerta (ALT001-ALT009)")


def run():
    db = SessionLocal()
    try:
        print("Cargando datos iniciales...")
        seed_prestadores(db)
        seed_spsts(db)
        seed_reglas(db)
        print("OK Datos iniciales cargados. El sistema esta listo.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
