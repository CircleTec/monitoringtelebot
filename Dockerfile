# STAGE 1: Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files and install dependencies
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

# Copy files from the builder stage with correct ownership
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/nodemon.json ./
COPY --from=builder --chown=node:node /app/drizzle.config.js ./

# Switch to non-root user for security
USER node

# Environment Variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Push schema changes to the DB, then start the application
CMD ["sh", "-c", "npx drizzle-kit push && npm start"]
