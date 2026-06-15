import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./data/billing.db';
  const filePath = url.startsWith('file:') ? url.slice(5) : url;
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

const sqlite = new Database(resolveDbPath());
export const db = drizzle(sqlite, { schema });