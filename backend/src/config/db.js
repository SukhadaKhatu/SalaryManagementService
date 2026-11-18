import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error));
