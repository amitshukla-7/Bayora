# Production Dockerfile for Bayora Intelligence Center
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy source code and build React frontend
COPY . .
RUN npm run build

# Production Runner
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend, server, and workspace
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/workspace ./workspace
COPY --from=builder /app/models.yaml ./models.yaml

EXPOSE 3001

CMD ["node", "--experimental-strip-types", "server/index.mjs"]
