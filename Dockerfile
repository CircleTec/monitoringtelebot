# STAGE 1: Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3 (Native C++ modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# STAGE 2: Production Stage
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies (iputils-ping for the monitoring bot)
RUN apt-get update && apt-get install -y \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create the data directory for SQLite persistence
RUN mkdir -p /app/data

# Copy files from the builder stage with correct ownership
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/nodemon.json ./
COPY --from=builder --chown=node:node /app/drizzle.config.js ./

# Ensure the node user owns the data directory for database writes
RUN chown -R node:node /app/data

# Switch to non-root user for security
USER node

# Environment Variables
ENV NODE_ENV=production
ENV PORT=3000
# Ensure the app code uses this same path for the SQLite file
ENV DATABASE_URL=/app/data/database.sqlite

EXPOSE 3000

# Push schema changes to the DB file, then start the application
CMD ["sh", "-c", "npx drizzle-kit push && npm start"]
