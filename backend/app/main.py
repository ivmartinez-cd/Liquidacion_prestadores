from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
import app.models  # noqa: F401 — registra todos los modelos en Base

from app.api.routers import (
    prestadores,
    spst,
    tarifarios,
    tabla_km,
    liquidaciones,
    dashboard,
)

app = FastAPI(
    title="Asistente de Liquidaciones de Prestadores",
    version="1.0.0",
    description="Motor de análisis de preliquidaciones de PSTs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(prestadores.router)
app.include_router(spst.router)
app.include_router(tarifarios.router)
app.include_router(tabla_km.router)
app.include_router(liquidaciones.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


