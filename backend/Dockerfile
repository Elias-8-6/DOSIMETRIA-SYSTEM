# ============================================================
# Dockerfile — Backend NestJS
# Desarrollo: hot reload con npm run start:dev
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Instalar dependencias nativas necesarias para bcrypt
RUN apk add --no-cache python3 make g++

# Copiar package.json e instalar dependencias DENTRO del contenedor
COPY package*.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]