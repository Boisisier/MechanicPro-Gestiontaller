#!/usr/bin/env node
// Aplica en orden todos los .sql de supabase/migrations/ contra DATABASE_URL, llevando
// registro en la tabla schema_migrations para no reaplicar. Requiere un rol con permisos de
// DDL (el rol de conexión normal de la app, app_runtime, no los tiene a propósito).
//
// Uso:
//   DATABASE_URL=postgresql://postgres:pass@host:5432/db node scripts/migrate.mjs
//
// Con APP_RUNTIME_PASSWORD seteada, al final fija esa contraseña para el rol app_runtime
// (pensado para bases efímeras de CI; no usar en producción para no rotar la contraseña real
// sin querer).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL es obligatoria.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'disable'
    ? false
    : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' },
});

const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

await pool.query(`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows: appliedRows } = await pool.query('select filename from schema_migrations');
const applied = new Set(appliedRows.map((row) => row.filename));

let appliedCount = 0;
for (const file of files) {
  if (applied.has(file)) {
    continue;
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  console.log(`Aplicando ${file}...`);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations (filename) values ($1)', [file]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    console.error(`Falló ${file}:`, error.message);
    await pool.end();
    process.exit(1);
  } finally {
    client.release();
  }
  appliedCount += 1;
}

console.log(
  appliedCount === 0
    ? 'Sin migraciones nuevas, esquema al día.'
    : `${appliedCount} migración(es) aplicada(s).`,
);

if (process.env.APP_RUNTIME_PASSWORD) {
  const password = process.env.APP_RUNTIME_PASSWORD.replace(/'/g, "''");
  await pool.query(`alter role app_runtime with password '${password}'`);
  console.log('Contraseña de app_runtime actualizada.');
}

await pool.end();
