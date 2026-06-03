FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias necesarias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Crear directorio para base de datos persistente
RUN mkdir -p /app/db_volume

# Copiar el código fuente
COPY . .

# Exponer el puerto del backend
EXPOSE 8002

# Ejecutar el seed y levantar uvicorn
CMD ["sh", "-c", "python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8002"]
