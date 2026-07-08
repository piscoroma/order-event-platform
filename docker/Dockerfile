# ==========================
# Dependencies
# ==========================
FROM node:22-alpine AS deps

ARG SERVICE_NAME

RUN test -n "$SERVICE_NAME"

WORKDIR /app

# Workspace manifests
COPY package*.json ./
COPY shared/package.json ./shared/
COPY services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Installa solo il workspace richiesto + dipendenze
RUN npm ci --omit=dev --workspace=services/${SERVICE_NAME}


# ==========================
# Runtime
# ==========================
FROM node:22-alpine

ARG SERVICE_NAME
ARG SERVICE_PORT

RUN test -n "$SERVICE_NAME"
RUN test -n "$SERVICE_PORT"

ENV NODE_ENV=production

WORKDIR /app

# Copia le dipendenze installate
COPY --from=deps /app/node_modules ./node_modules

# Copia il codice
COPY shared ./shared
COPY services/${SERVICE_NAME} ./services/${SERVICE_NAME}

WORKDIR /app/services/${SERVICE_NAME}

EXPOSE ${SERVICE_PORT}

CMD ["npm", "start"]