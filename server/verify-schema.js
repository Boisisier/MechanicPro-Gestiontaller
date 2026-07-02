import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { loadConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const config = loadConfig();
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl
    ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
    : false,
});

const requiredTables = [
  "companies",
  "users",
  "workshop_users",
  "vehicles",
  "service_catalog",
  "vehicle_services",
  "inventory_items",
  "inventory_movements",
  "inventory_suppliers",
  "inventory_purchase_orders",
  "inventory_stock_counts",
  "budget_quotes",
  "budget_quote_items",
  "audit_logs",
  "parking_releases",
];

try {
  const result = await pool.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name=any($1::text[])`,
    [requiredTables],
  );
  const existing = new Set(result.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !existing.has(table));
  if (missing.length) {
    console.error(`Esquema incompleto. Tablas faltantes: ${missing.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Esquema verificado: ${requiredTables.length} tablas requeridas.`);
  }
} finally {
  await pool.end();
}
