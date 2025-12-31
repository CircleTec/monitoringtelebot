import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const dbPath = process.env.DATABASE_URL || '/app/data/database.sqlite';
const sqlite = new SQLite(dbPath);
export const db = drizzle(sqlite, { schema });

// In a real app we'd use migrations, but for simplicity we can enable pragmas
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export default db;
