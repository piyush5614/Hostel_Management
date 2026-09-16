import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export interface LocalAuthUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  profile_image?: string;
  generated_id?: string;
  college_id: string;
  is_active: boolean | number;
}

let databasePromise: Promise<Database> | null = null;

function getDatabasePath(): string {
  return process.env.LOCAL_DB_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../hostel.db');
}

async function getDatabase(): Promise<Database> {
  databasePromise ??= open({ filename: getDatabasePath(), driver: sqlite3.Database });
  return databasePromise;
}

export async function findLocalAuthUser(identifier: string): Promise<LocalAuthUser | null> {
  const database = await getDatabase();
  return database.get<LocalAuthUser>(
    `SELECT id, email, password, name, role, profile_image, generated_id, college_id, is_active
     FROM users
     WHERE (lower(email) = lower(?) OR lower(generated_id) = lower(?))
       AND is_active = 1
     LIMIT 1`,
    identifier,
    identifier,
  ) || null;
}

export async function updateLocalLastLogin(userId: string): Promise<void> {
  const database = await getDatabase();
  await database.run('UPDATE users SET last_login = ? WHERE id = ?', new Date().toISOString(), userId);
}