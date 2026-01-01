import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
    connectionString,
    ssl: false, // Dokploy PostgreSQL doesn't support SSL
});

export const db = drizzle(pool, { schema });

export default db;
