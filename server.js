const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Point it at your Neon (or any) Postgres connection string.');
  process.exit(1);
}

// Most hosted Postgres (Neon, Render, etc.) requires SSL. Set PG_SSL=false for a
// plain local Postgres with no SSL configured (e.g. while developing on your laptop).
const useSSL = process.env.PG_SSL !== 'false';
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

function defaultState() {
  return { projects: [], skills: [], activeTab: 'projects' };
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bench_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await pool.query('SELECT 1 FROM bench_state WHERE id = 1');
  if (rows.length === 0) {
    await pool.query('INSERT INTO bench_state (id, data) VALUES (1, $1)', [defaultState()]);
  }
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function checkPassword(req, res, next) {
  if (!APP_PASSWORD) return next(); // no password configured — open access, see startup warning
  const provided = req.header('x-app-password');
  if (provided && provided === APP_PASSWORD) return next();
  res.status(401).json({ error: 'Wrong password' });
}

app.get('/api/state', checkPassword, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data FROM bench_state WHERE id = 1');
    res.json(rows[0] ? rows[0].data : defaultState());
  } catch (e) {
    console.error('Read failed', e);
    res.status(500).json({ error: 'Could not read saved state' });
  }
});

app.put('/api/state', checkPassword, async (req, res) => {
  try {
    await pool.query('UPDATE bench_state SET data = $1, updated_at = now() WHERE id = 1', [req.body]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Write failed', e);
    res.status(500).json({ error: 'Could not save state' });
  }
});

app.get('/healthz', (req, res) => res.send('ok'));

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      if (!APP_PASSWORD) {
        console.warn('WARNING: APP_PASSWORD is not set. Anyone who reaches this server can read/write your data.');
      }
      console.log('The Bench is running on port ' + PORT);
    });
  })
  .catch((e) => {
    console.error('Failed to set up the database schema', e);
    process.exit(1);
  });
