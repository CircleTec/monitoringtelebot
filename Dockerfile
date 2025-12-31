# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Production Stage
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies (iputils-ping for monitoring)
RUN apt-get update && apt-get install -y \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/nodemon.json ./
COPY --from=builder /app/drizzle.config.js ./

# Create data directory for SQLite persistence
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use non-root user
USER node

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/app/data/database.sqlite

EXPOSE 3000

# Start script
CMD ["npm", "start"]
