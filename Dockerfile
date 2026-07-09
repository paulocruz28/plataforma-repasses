# Stage 1: Build do Frontend React + TypeScript
FROM node:20-alpine AS frontend-builder
WORKDIR /usr/src/app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build e Setup do Backend Express (TypeScript)
FROM node:20-alpine
WORKDIR /usr/src/app

# Copiar dependências do backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copiar código do backend e compilar TypeScript
COPY backend/ ./backend/
RUN cd backend && npm run build

# Copiar build do frontend estático para a pasta que o Express serve
COPY --from=frontend-builder /usr/src/app/frontend/dist ./frontend/dist

EXPOSE 3000

# Executar a versão compilada do backend
CMD ["node", "backend/dist/server.js"]
