import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
});

const main = async () => {
  const company = (
    await pool.query("select id, name from companies where name = $1 limit 1", [
      process.env.DEMO_COMPANY_NAME || "Taller Demo",
    ])
  ).rows[0];
  const patentes = ["NVRL-63", "QWPL-79", "TBRC-18"];
  const quotePatentes = ["ZKPT-54", "WJKS-36", "PRMN-82", "DCLS-47", "FTGH-12"];
  const skuPrefixes = ["REP-FIL-AIR-011", "REP-FIL-COM-012", "INS-ACE-10W40-011", "INS-SEG-MAS-020"];
  const users = (
    await pool.query(
      "select email, role_name from workshop_users where company_id=$1 and email in ('admin.operaciones@mechanicpro.cl','administrativo3@mechanicpro.cl','administrativo4@mechanicpro.cl','mecanico4@mechanicpro.cl','mecanico5@mechanicpro.cl','mecanico6@mechanicpro.cl') order by email",
      [company.id],
    )
  ).rows;
  const inventory = (
    await pool.query(
      "select sku, name, item_type, stock from inventory_items where company_id=$1 and sku = any($2::text[]) order by sku",
      [company.id, skuPrefixes],
    )
  ).rows;
  const vehicles = (
    await pool.query(
      "select patente, marca, modelo, estado, assigned_mechanic_name from vehicles where company_id=$1 and patente = any($2::text[]) order by patente",
      [company.id, patentes],
    )
  ).rows;
  const budgets = (
    await pool.query(
      "select patente, vehicle, status, total::int from budget_quotes where company_id=$1 and patente = any($2::text[]) order by patente",
      [company.id, quotePatentes],
    )
  ).rows;
  const counts = (
    await pool.query(
      `select
        (select count(*) from inventory_items where company_id=$1) inventory_total,
        (select count(*) from inventory_items where company_id=$1 and item_type='repuesto') repuestos,
        (select count(*) from inventory_items where company_id=$1 and item_type='insumo') insumos,
        (select count(*) from vehicles where company_id=$1 and estado='En Taller') vehicles_en_taller,
        (select count(*) from budget_quotes where company_id=$1) budgets_total`,
      [company.id],
    )
  ).rows[0];
  console.log(JSON.stringify({ company: company.name, users, inventory, vehicles, budgets, counts }, null, 2));
  await pool.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
