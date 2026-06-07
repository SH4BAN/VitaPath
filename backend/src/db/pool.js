import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
