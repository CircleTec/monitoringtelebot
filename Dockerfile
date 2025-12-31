# STAGE 1: Build Stage
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

# STAGE 2: Production Stage
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create data directory
RUN mkdir -p /app/data

# Copy from the 'builder' stage defined above
# Added --chown=node:node to ensure the node user owns these files immediately
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/nodemon.json ./
COPY --from=builder --chown=node:node /app/drizzle.config.js ./

# Set permissions for the database folder
RUN chown -R node:node /app/data

USER node

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/app/data/database.sqlite

EXPOSE 3000

CMD ["npm", "start"]
