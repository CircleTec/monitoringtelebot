// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { hashPassword } from './utils/auth.js';
import { eq } from 'drizzle-orm';
import { startMonitoring } from './engine/index.js';
import { initBot } from './bot/index.js';
import authRoutes from './api/auth.js';
import serviceRoutes from './api/services.js';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "cdn.tailwindcss.com"], // Allow tailwind CDN for now as per user frontend
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Seed admin user if not exists
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await hashPassword(adminPassword);

  const existing = await db.select().from(users).where(eq(users.email, adminEmail));

  if (existing.length === 0) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: hashedPassword,
    });
    console.log('Admin user seeded.');
  } else {
    // Always update password to match .env
    await db.update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.email, adminEmail));
    console.log('Admin password updated from .env');
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function start() {
  await seedAdmin();

  // Initialize Telegram Bot
  initBot();

  // Start Monitoring Engine
  startMonitoring();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful Shutdown
  const shutdown = () => {
    console.log('Stopping server and monitoring...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Fatal Initialization Error:', err);
  process.exit(1);
});
