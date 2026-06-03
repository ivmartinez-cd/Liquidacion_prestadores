FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar el código del frontend
COPY . .

# Compilar Next.js para producción
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Arrancar en modo producción (next start)
CMD ["npm", "run", "start"]
