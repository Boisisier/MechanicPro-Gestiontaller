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
  const { rows } = await pool.query(`
    select
      c.id,
      c.name,
      c.created_at,
      (select count(*) from workshop_users wu where wu.company_id = c.id) as users,
      (select count(*) from inventory_items i where i.company_id = c.id) as inventory,
      (select count(*) from vehicles v where v.company_id = c.id) as vehicles,
      (select count(*) from budget_quotes b where b.company_id = c.id) as budgets
    from companies c
    where c.name in ('Taller Demo', 'Demo Taller')
    order by c.name, c.created_at
  `);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
