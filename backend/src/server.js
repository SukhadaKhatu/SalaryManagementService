import 'dotenv/config';
import app from './app.js';
import { pool } from './config/db.js';
const port = Number(process.env.PORT || 3000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const server = app.listen(port, () => console.log(`Salary API listening on port ${port}`));
function shutdown() { server.close(() => pool.end().finally(() => process.exit())); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
