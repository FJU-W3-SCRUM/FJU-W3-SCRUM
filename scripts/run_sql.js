const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '004_gratitude_wall.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Migration file not found:', sqlPath);
  process.exit(2);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
  host: process.env.PGHOST || process.env.SUPABASE_HOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || process.env.SUPABASE_DATABASE,
  user: process.env.PGUSER || process.env.SUPABASE_USER,
  password: process.env.PGPASSWORD || process.env.SUPABASE_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('Connecting to', client.host + ':' + client.port, 'database', client.database);
    await client.connect();
    console.log('Connected. Running migration...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exit(1);
  } finally {
    await client.end();
  }
})();
