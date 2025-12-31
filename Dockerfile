# Production Stage
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# 1. Create the data directory as ROOT first
RUN mkdir -p /app/data

# 2. Copy files from builder (ensure ownership is transferred)
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/nodemon.json ./
COPY --from=builder /app/drizzle.config.js ./

# 3. SET PERMISSIONS for the node user on the data folder
RUN chown -R node:node /app/data

# 4. Now switch to the non-root user
USER node

ENV NODE_ENV=production
ENV PORT=3000
# Ensure this path is absolute and matches the chown'd folder
ENV DATABASE_URL=/app/data/database.sqlite

EXPOSE 3000
CMD ["npm", "start"]
