import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_URL || './data/database.sqlite';

// Ensure the directory exists
try {
    mkdirSync(dirname(dbPath), { recursive: true });
} catch (err) {
    // Directory already exists or can't be created
}

const sqlite = new SQLite(dbPath);
export const db = drizzle(sqlite, { schema });

// In a real app we'd use migrations, but for simplicity we can enable pragmas
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export default db;
