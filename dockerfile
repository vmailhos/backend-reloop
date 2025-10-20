# Usa Node 20 como base (trae node y npm)
FROM node:20

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos SOLO los package*.json primero (para cachear la instalación)
COPY package*.json ./

# Instalamos dependencias exactas de package-lock.json
# (si no tenés lock o preferís, podés usar "npm install")
RUN npm ci

# Ahora copiamos el resto del código fuente
COPY . .

# Exponemos el puerto que escucha Express
EXPOSE 3000

# No ponemos CMD aquí, porque lo definimos en docker-compose.yml (command)
