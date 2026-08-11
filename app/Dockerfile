# ---- Build stage ----
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- Runtime stage ----
FROM node:18-alpine
WORKDIR /app

# Run as non-root
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules ./node_modules
COPY . .
RUN chown -R app:app /app
USER app

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]

