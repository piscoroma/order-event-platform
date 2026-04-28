# ─── Stage dev ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

EXPOSE 3001
CMD ["npx", "nodemon", "--watch", "src", "src/server.js"]

# ─── Stage prod ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS prod

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/healthz || exit 1

CMD ["node", "src/server.js"]
