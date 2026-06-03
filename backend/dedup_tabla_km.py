"""
Elimina entradas duplicadas de tabla_km manteniendo la primera de cada
combinación (prestador_id, empresa_nombre, sucursal_nombre).
Ejecutar con: python dedup_tabla_km.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "liquidaciones.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM tabla_kms")
total_before = cur.fetchone()[0]
print(f"Filas antes: {total_before}")

cur.execute("""
    DELETE FROM tabla_kms
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM tabla_kms
        GROUP BY prestador_id, empresa_nombre, sucursal_nombre
    )
""")

deleted = cur.rowcount
conn.commit()

cur.execute("SELECT COUNT(*) FROM tabla_kms")
total_after = cur.fetchone()[0]
print(f"Eliminadas: {deleted}")
print(f"Filas finales: {total_after}")

conn.close()
