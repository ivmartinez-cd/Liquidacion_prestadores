import pandas as pd
import sys
import argparse
from datetime import datetime, date, timedelta
import os

# Ajustar el path para que pueda importar módulos de la app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.prestador import Prestador
from app.models.tarifario import Tarifario

def normalize_tipo(col_name: str) -> str:
    c = col_name.lower().strip()
    if 'correctivo' in c and 'pre' not in c and 'p. correc' not in c:
        return 'correctivo'
    if 'pre' in c and 'correctivo' in c or 'p. correc' in c:
        return 'pre_correctivo'
    if 'preventivo' in c:
        return 'preventivo'
    if 'instalaci' in c or 'desinstalaci' in c:
        return 'instalacion_desinstalacion'
    if 'guardia' in c:
        return 'guardia'
    if 'sistemas' in c:
        return 'sistemas'
    return None

def main():
    parser = argparse.ArgumentParser(description="Importar histórico de tarifas desde Excel.")
    parser.add_argument("archivo", help="Ruta al archivo Excel")
    parser.add_argument("--prestador-id", type=int, help="ID del prestador (opcional, si no se especifica intentará buscarlo por nombre)", required=False)
    parser.add_argument("--zona", type=str, help="Zona a la que aplican estas tarifas (opcional, ej: 'Villa Mercedes')", required=False)
    args = parser.parse_args()

    db = SessionLocal()
    
    try:
        df = pd.read_excel(args.archivo, header=None)
        df = df.dropna(how='all')
        
        # Encontrar la fila que dice "Prestador"
        prestador_row_idx = None
        for idx, row in df.iterrows():
            val = str(row[0]).strip().lower()
            if val == 'prestador':
                prestador_row_idx = idx
                break
                
        nombre_prestador_excel = "Desconocido"
        if prestador_row_idx is not None and (prestador_row_idx + 1) in df.index:
            nombre_prestador_excel = str(df.iloc[prestador_row_idx + 1, 0]).strip()
            
        print(f"Prestador detectado en archivo: {nombre_prestador_excel}")

        prestador = None
        if args.prestador_id:
            prestador = db.query(Prestador).filter(Prestador.id == args.prestador_id).first()
        else:
            # Buscar por nombre exacto
            prestador = db.query(Prestador).filter(Prestador.nombre.ilike(f"%{nombre_prestador_excel}%")).first()
            if not prestador:
                # Intentar buscar por partes del nombre (ej: "Supernova")
                partes = nombre_prestador_excel.split("-")
                for p in partes:
                    ps = p.strip()
                    if len(ps) > 4:
                        prestador = db.query(Prestador).filter(Prestador.nombre_corto.ilike(f"%{ps}%")).first()
                        if prestador: break

        if not prestador:
            print("No se encontró el prestador en la BD.")
            print("Puede ejecutar el script pasando el ID manualmente: python importador_tarifas.py archivo.xlsx --prestador-id <ID>")
            sys.exit(1)
            
        print(f"Importando tarifas para prestador: {prestador.nombre} (ID: {prestador.id}) | Zona: {args.zona or 'General (Toda la cobertura)'}")

        # Encontrar la fila de cabeceras
        header_idx = None
        for idx, row in df.iterrows():
            val = str(row[0]).strip().lower()
            if 'correctivo' in val or 'preventivo' in val:
                header_idx = idx
                break
                
        if header_idx is None:
            print("No se encontró la fila de cabeceras de tarifas (buscando 'Correctivo').")
            sys.exit(1)
            
        headers = df.iloc[header_idx].tolist()
        
        creados = 0
        omitidos = 0
        rebuild_keys = set()
        
        # Obtener tarifas existentes que correspondan a la misma zona
        existing = {
            (t.tipo_servicio, t.vigencia_desde) 
            for t in db.query(Tarifario).filter(
                Tarifario.prestador_id == prestador.id,
                Tarifario.zona == args.zona
            ).all()
        }
        
        for idx in range(header_idx + 1, len(df)):
            row = df.iloc[idx]
            
            vigencia_desde = None
            
            # Buscar fecha
            for col_idx, col_name in enumerate(headers):
                if pd.isna(col_name): continue
                c_name = str(col_name).lower()
                if 'vigen' in c_name or 'fecha' in c_name:
                    val = row[col_idx]
                    if pd.notna(val):
                        try:
                            if isinstance(val, datetime):
                                vigencia_desde = val.date()
                            else:
                                vigencia_desde = pd.to_datetime(val).date()
                        except:
                            pass
            
            if not vigencia_desde:
                continue # Saltar filas sin fecha
                
            # Buscar Costo KM
            costo_km = 0.0
            for col_idx, col_name in enumerate(headers):
                if pd.isna(col_name): continue
                if 'km' in str(col_name).lower():
                    v = row[col_idx]
                    if pd.notna(v):
                        try:
                            costo_km = float(v)
                        except:
                            pass
                            
            # Procesar cada tipo de servicio
            for col_idx, col_name in enumerate(headers):
                if pd.isna(col_name): continue
                tipo = normalize_tipo(str(col_name))
                if not tipo: continue # No es un servicio válido
                
                costo_serv = row[col_idx]
                if pd.isna(costo_serv): continue
                
                try:
                    costo_serv = float(costo_serv)
                except:
                    continue
                    
                key = (tipo, vigencia_desde)
                if key in existing:
                    omitidos += 1
                    continue
                    
                t = Tarifario(
                    prestador_id=prestador.id,
                    tipo_servicio=tipo,
                    zona=args.zona,
                    costo_servicio=costo_serv,
                    costo_km=costo_km,
                    vigencia_desde=vigencia_desde,
                    vigencia_hasta=None
                )
                db.add(t)
                existing.add(key)
                creados += 1
                rebuild_keys.add((prestador.id, tipo, args.zona))
                
        db.flush()
        
        # Reconstruir las cadenas temporales
        for pid, t_serv, z in rebuild_keys:
            tarifas = (
                db.query(Tarifario)
                .filter(
                    Tarifario.prestador_id == pid,
                    Tarifario.tipo_servicio == t_serv,
                    Tarifario.zona == z,
                )
                .order_by(Tarifario.vigencia_desde.asc())
                .all()
            )
            for i in range(len(tarifas) - 1):
                tarifas[i].vigencia_hasta = tarifas[i+1].vigencia_desde - timedelta(days=1)
                
        db.commit()
        print(f"Importación exitosa: {creados} registros creados, {omitidos} omitidos (ya existían).")

    except Exception as e:
        print(f"Error durante la importación: {e}")
        db.rollback()
    finally:
        db.close()
        
if __name__ == '__main__':
    main()
