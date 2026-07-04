import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
});

const main = async () => {
  const client = await pool.connect();
  try {
    const companyName = process.env.DEMO_COMPANY_NAME || "Demo Taller";
    const company = (
      await client.query("select id, name from companies where name = $1 limit 1", [
        companyName,
      ])
    ).rows[0];
    if (!company) {
      throw new Error(`No existe la empresa ${companyName}`);
    }
    const count = async (sql, params = []) =>
      Number((await client.query(sql, params)).rows[0].count);

    const demoPatentes = ["KTRP-84", "LPSD-31", "MXVR-52"];
    const budgetPatentes = ["HHJK-21", "JHLD-90", "PKLR-18", "RVST-44", "TRCN-27"];

    const vehicles = (
      await client.query(
        `select patente, marca, modelo, assigned_mechanic_name, estado
         from vehicles
         where company_id = $1 and patente = any($2::text[])
         order by patente`,
        [company.id, demoPatentes],
      )
    ).rows;

    const budgets = (
      await client.query(
        `select patente, vehicle, status, total::int as total
         from budget_quotes
         where company_id = $1 and patente = any($2::text[])
         order by patente`,
        [company.id, budgetPatentes],
      )
    ).rows;

    const users = (
      await client.query(
        `select email, role_name
         from workshop_users
         where company_id = $1 and email like '%@mechanicpro.cl'
         order by role_name, email`,
        [company.id],
      )
    ).rows;

    console.log(
      JSON.stringify(
        {
          company: company.name,
          demoUsers: users.length,
          inventoryTotal: await count("select count(*) from inventory_items where company_id = $1", [
            company.id,
          ]),
          repuestos: await count(
            "select count(*) from inventory_items where company_id = $1 and item_type = 'repuesto'",
            [company.id],
          ),
          insumos: await count(
            "select count(*) from inventory_items where company_id = $1 and item_type = 'insumo'",
            [company.id],
          ),
          vehicles,
          budgets,
          workshopServiceLinks: await count(
            `select count(*)
             from vehicle_services vs
             join vehicles v on v.id = vs.vehicle_id
             where v.company_id = $1 and v.patente = any($2::text[])`,
            [company.id, demoPatentes],
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
